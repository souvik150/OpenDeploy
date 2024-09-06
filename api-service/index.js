const express = require("express");
const { generateSlug } = require("random-word-slugs");
const { ECSClient, RunTaskCommand } = require("@aws-sdk/client-ecs");
const { Server } = require("socket.io");
const { z } = require("zod");
const { DeployementStatus } = require("@prisma/client");
const { PrismaClient } = require("@open-deploy/prisma-schema");

const { createClient } = require("@clickhouse/client");
const { Kafka } = require("kafkajs");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const cors = require("cors");

const AWS_REGION = process.env.AWS_REGION;
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY;
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY;
const CLUSTER = process.env.CLUSTER_ARN;
const TASK = process.env.BUILDER_TASK_ARN;
const SUBNET_GROUP_IDS = process.env.SUBNET_GROUP_IDS.split(",");
const SECURITY_GROUP_IDS = process.env.SECURITY_GROUP_IDS.split(",");
const BUILDER_IMAGE_NAME = process.env.BUILDER_IMAGE_NAME;
// const REDIS_URL = process.env.REDIS_URL;

const app = express();
const PORT = 9000;

// const subscriber = new Redis(REDIS_URL);

console.log(path.join(__dirname, "kafka.pem"));
const kafka = new Kafka({
  clientId: `api-server`,
  brokers: [process.env.KAFKA_BROKER],
  ssl: {
    rejectUnauthorized: true,
    ca: [fs.readFileSync(path.join(__dirname, "kafka.pem"), "utf-8")],
  },
  sasl: {
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD,
    mechanism: "plain",
  },
  retry: {
    retries: 10,
    initialRetryTime: 300,
    factor: 0.2,
    multiplier: 2,
    maxRetryTime: 10000,
  },
  connectionTimeout: 10000,
});

const client = createClient({
  host: process.env.CLICKHOUSE_HOST,
  database: "default",
  username: process.env.CLICKHOUSE_USERNAME,
  password: process.env.CLICKHOUSE_PASSWORD,
});

const consumer = kafka.consumer({ groupId: "api-server-logs-consumer" });

const prisma = new PrismaClient({
  // log: ["query"],
});

const io = new Server({ cors: "*" });

io.on("connection", (socket) => {
  socket.on("subscribe", (channel) => {
    socket.join(channel);
    socket.emit("message", `Joined ${channel}`);
  });
});

io.listen(9002, () => console.log("Socket Server 9002"));

const ecsClient = new ECSClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_KEY,
  },
});

const config = {
  CLUSTER: CLUSTER,
  TASK: TASK,
};

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  return res.json({
    status: "success",
    message: "Open Deploy API Server Running..",
  });
});

app.post("/project", async (req, res) => {
  const schema = z.object({
    name: z.string(),
    gitURL: z.string().regex(/https:\/\/github.com\/.*/),
  });

  const safeParseRes = schema.safeParse(req.body);

  if (safeParseRes.error) {
    return res.status(400).json({ error: safeParseRes.error.errors });
  }

  const { name, gitURL } = safeParseRes.data;

  const project = await prisma.project.create({
    data: {
      name,
      gitURL,
      subDomain: generateSlug(),
    },
  });

  return res.json({
    status: "success",
    data: project,
  });
});

app.post("/deploy", async (req, res) => {
  const { projectId } = req.body;
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
  });

  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  // Check if there is no running deployment
  const existingDeployment = await prisma.deployment.findFirst({
    where: {
      projectId,
      status: DeployementStatus.IN_PROGRESS,
    },
  });

  if (existingDeployment) {
    return res.status(400).json({ error: "Deployment already running" });
  }

  const deployment = await prisma.deployment.create({
    data: {
      projectId,
      status: DeployementStatus.QUEUED,
    },
  });

  // Spin the container
  const command = new RunTaskCommand({
    cluster: config.CLUSTER,
    taskDefinition: config.TASK,
    launchType: "FARGATE",
    count: 1,
    networkConfiguration: {
      awsvpcConfiguration: {
        assignPublicIp: "ENABLED",
        subnets: SUBNET_GROUP_IDS,
        securityGroups: SECURITY_GROUP_IDS,
      },
    },
    overrides: {
      containerOverrides: [
        {
          name: BUILDER_IMAGE_NAME,
          environment: [
            { name: "GIT_REPOSITORY__URL", value: project.gitURL },
            { name: "PROJECT_ID", value: projectId },
            { name: "DEPLOYMENT_ID", value: deployment.id.toString() },
          ],
        },
      ],
    },
  });

  await ecsClient.send(command);

  return res.json({
    status: "queued",
    data: {
      deploymentId: deployment.id,
    },
  });
});

app.get("/logs/:id", async (req, res) => {
  const id = req.params.id;
  const logs = await client.query({
    query: `SELECT event_id, deployment_id, log, timestamp from log_events where deployment_id = {deployment_id:String}`,
    query_params: {
      deployment_id: id,
    },
    format: "JSONEachRow",
  });

  const rawLogs = await logs.json();

  return res.json({ logs: rawLogs });
});

async function initkafkaConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topics: ["container-logs"], fromBeginning: true });

  await consumer.run({
    eachBatch: async function ({
      batch,
      heartbeat,
      commitOffsetsIfNecessary,
      resolveOffset,
    }) {
      const messages = batch.messages;
      console.log(`Recv. ${messages.length} messages..`);
      for (const message of messages) {
        if (!message.value) continue;
        const stringMessage = message.value.toString();
        const { PROJECT_ID, DEPLOYMENT_ID, log } = JSON.parse(stringMessage);
        console.log({ log, DEPLOYMENT_ID });
        try {
          const { query_id } = await client.insert({
            table: "log_events",
            values: [{ event_id: uuidv4(), deployment_id: DEPLOYMENT_ID, log }],
            format: "JSONEachRow",
          });
          console.log(query_id);
          resolveOffset(message.offset);
          await commitOffsetsIfNecessary(message.offset);
          await heartbeat();
        } catch (err) {
          console.log(err);
        }
      }
    },
  });
}

initkafkaConsumer();

app.listen(PORT, () => console.log(`API Server Running..${PORT}`));
