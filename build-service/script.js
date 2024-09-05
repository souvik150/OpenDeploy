const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const mime = require("mime-types");
const { Kafka } = require("kafkajs");
const {
  PrismaClient,
  // DeployementStatus,
} = require("@open-deploy/prisma-schema");
const { DeployementStatus } = require("@prisma/client");

const PROJECT_ID = process.env.PROJECT_ID;
const DEPLOYMENT_ID = process.env.DEPLOYMENT_ID;
const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME;
const AWS_REGION = process.env.AWS_REGION;
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY;
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY;

const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_KEY,
  },
});

const prisma = new PrismaClient();

const kafka = new Kafka({
  clientId: `docker-build-server-${DEPLOYMENT_ID}`,
  brokers: [process.env.KAFKA_BROKER],
  ssl: {
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

const producer = kafka.producer();

async function publishLog(log) {
  await producer.send({
    topic: `container-logs`,
    messages: [
      { key: "log", value: JSON.stringify({ PROJECT_ID, DEPLOYMENT_ID, log }) },
    ],
  });
}

async function init() {
  await producer.connect();

  const deployment = await prisma.deployment.findUnique({
    where: {
      id: DEPLOYMENT_ID,
    },
  });

  console.log("Executing script.js");
  await publishLog("Build Started...");

  await prisma.deployment.update({
    where: {
      id: DEPLOYMENT_ID,
    },
    data: {
      status: DeployementStatus.IN_PROGRESS,
    },
  });

  const outDirPath = path.join(__dirname, "output");

  const p = exec(`cd ${outDirPath} && npm install && npm run build`);

  p.stdout.on("data", async function (data) {
    console.log(data.toString());
    await publishLog(data.toString());
  });

  p.stdout.on("error", async function (data) {
    console.log("Error", data.toString());
    await prisma.deployment.update({
      where: {
        id: DEPLOYMENT_ID,
      },
      data: {
        status: DeployementStatus.FAIL,
      },
    });
    await publishLog(`error: ${data.toString()}`);
  });

  p.on("close", async function () {
    console.log("Build Complete");
    await publishLog(`Build Complete`);
    await prisma.deployment.update({
      where: {
        id: DEPLOYMENT_ID,
      },
      data: {
        status: DeployementStatus.READY,
      },
    });

    const distFolderPath = path.join(__dirname, "output", "dist");
    // create dist if not exists
    if (!fs.existsSync(distFolderPath)) {
      fs.mkdirSync(distFolderPath, { recursive: true });
    }
    const distFolderContents = fs.readdirSync(distFolderPath, {
      recursive: true,
    });

    await publishLog(`Starting to upload`);

    for (const file of distFolderContents) {
      const filePath = path.join(distFolderPath, file);
      if (fs.lstatSync(filePath).isDirectory()) continue;

      console.log("uploading", filePath);
      await publishLog(`uploading ${file}`);

      const command = new PutObjectCommand({
        Bucket: AWS_BUCKET_NAME,
        Key: `__outputs/${DEPLOYMENT_ID}/${file}`,
        Body: fs.createReadStream(filePath),
        ContentType: mime.lookup(filePath),
      });

      await s3Client.send(command);
      await publishLog(`uploaded ${file}`);
      console.log("uploaded", filePath);
    }
    await publishLog(`Done`);
    console.log("Done...");
    process.exit(0);
  });
}

init();
