const express = require("express");
const { generateSlug } = require("random-word-slugs");
const { ECSClient, RunTaskCommand } = require("@aws-sdk/client-ecs");
const { Server } = require("socket.io");
const Redis = require("ioredis");
require("dotenv").config();

const AWS_REGION = process.env.AWS_REGION;
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY;
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY;
const CLUSTER = process.env.CLUSTER_ARN;
const TASK = process.env.BUILDER_TASK_ARN;
const SUBNET_GROUP_IDS = process.env.SUBNET_GROUP_IDS.split(",");
const SECURITY_GROUP_IDS = process.env.SECURITY_GROUP_IDS.split(",");
const BUILDER_IMAGE_NAME = process.env.BUILDER_IMAGE_NAME;
const REDIS_URL = process.env.REDIS_URL;

const app = express();
const PORT = 9000;

const subscriber = new Redis(REDIS_URL);

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

app.post("/project", async (req, res) => {
  const { gitURL, slug } = req.body;
  const projectSlug = slug ? slug : generateSlug();

  console.log("Project Slug: ", projectSlug);
  console.log("Git URL: ", gitURL);

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
            { name: "GIT_REPOSITORY__URL", value: gitURL },
            { name: "PROJECT_ID", value: projectSlug },
          ],
        },
      ],
    },
  });

  await ecsClient.send(command);

  return res.json({
    status: "queued",
    data: { projectSlug, url: `http://${projectSlug}.localhost:8000` },
  });
});

async function initRedisSubscribe() {
  console.log("Subscribed to logs....");
  subscriber.psubscribe("logs:*");
  subscriber.on("pmessage", (pattern, channel, message) => {
    io.to(channel).emit("message", message);
  });
}

initRedisSubscribe();

app.listen(PORT, () => console.log(`API Server Running..${PORT}`));
