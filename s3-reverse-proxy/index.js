const express = require("express");
const httpProxy = require("http-proxy");
require("dotenv").config();

const app = express();
const PORT = 8000;

const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME;

const BASE_PATH = `https://${AWS_BUCKET_NAME}.s3.amazonaws.com/__outputs`;

const proxy = httpProxy.createProxy();

app.use((req, res) => {
  const hostname = req.hostname;
  const subdomain = hostname.split(".")[0];

  // Custom Domain - DB Query

  const resolvesTo = `${BASE_PATH}/${subdomain}`;
  console.log("Resolves To: ", resolvesTo);

  return proxy.web(req, res, { target: resolvesTo, changeOrigin: true });
});

proxy.on("proxyReq", (proxyReq, req, res) => {
  const url = req.url;
  if (url === "/") proxyReq.path += "index.html";
});

app.listen(PORT, () => console.log(`Reverse Proxy Running at ${PORT}`));
