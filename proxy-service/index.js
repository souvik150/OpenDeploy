const express = require("express");
const httpProxy = require("http-proxy");
const {
  PrismaClient,
  DeployementStatus,
} = require("@open-deploy/prisma-schema");
require("dotenv").config();

const app = express();
const PORT = 8000;

const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME;

const BASE_PATH = `https://${AWS_BUCKET_NAME}.s3.amazonaws.com/__outputs`;

const proxy = httpProxy.createProxy();
const prisma = new PrismaClient({
  // log: ["query"],
});

app.use(express.json());

app.use(async (req, res) => {
  const hostname = req.hostname;
  const subdomain = hostname.split(".")[0];

  const project = await prisma.project.findFirst({
    where: {
      subDomain: subdomain,
    },
    include: {
      Deployement: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const deployment = project.Deployement[0];
  if (!deployment) {
    return res.status(404).json({ error: "No deployment found" });
  } else if (
    deployment.status === DeployementStatus.IN_PROGRESS ||
    deployment.status === DeployementStatus.QUEUED
  ) {
    return res.status(404).json({ error: "Deployment in progress" });
  } else if (deployment.status === DeployementStatus.FAIL) {
    return res.status(404).json({ error: "Deployment failed" });
  }

  const resolvesTo = `${BASE_PATH}/${deployment.id}`;
  console.log("Resolves To: ", resolvesTo);

  return proxy.web(req, res, { target: resolvesTo, changeOrigin: true });
});

proxy.on("proxyReq", (proxyReq, req, res) => {
  const url = req.url;
  if (url === "/") proxyReq.path += "index.html";
});

app.listen(PORT, () => console.log(`Reverse Proxy Running at ${PORT}`));
