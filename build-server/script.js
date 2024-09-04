const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const mime = require("mime-types");
// const Redis = require("ioredis");

// const publisher = new Redis("");

const PROJECT_ID = process.env.PROJECT_ID;

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

// function publishLog(log) {
//   publisher.publish(`logs:${PROJECT_ID}`, JSON.stringify({ log }));
// }

async function init() {
  console.log("Executing script.js");
  // publishLog("Build Started...");

  const outDirPath = path.join(__dirname, "output");

  const p = exec(`cd ${outDirPath} && npm install && npm run build`);

  p.stdout.on("data", function (data) {
    console.log(data.toString());
    // publishLog(data.toString());
  });

  p.stdout.on("error", function (data) {
    console.log("Error", data.toString());
    // publishLog(`error: ${data.toString()}`);
  });

  p.on("close", async function () {
    console.log("Build Complete");
    // publishLog(`Build Complete`);

    const distFolderPath = path.join(__dirname, "output", "dist");
    // create dist if not exists
    if (!fs.existsSync(distFolderPath)) {
      fs.mkdirSync(distFolderPath, { recursive: true });
    }
    const distFolderContents = fs.readdirSync(distFolderPath, {
      recursive: true,
    });

    // publishLog(`Starting to upload`);

    for (const file of distFolderContents) {
      const filePath = path.join(distFolderPath, file);
      if (fs.lstatSync(filePath).isDirectory()) continue;

      console.log("uploading", filePath);
      // publishLog(`uploading ${file}`);

      const command = new PutObjectCommand({
        Bucket: AWS_BUCKET_NAME,
        Key: `__outputs/${PROJECT_ID}/${file}`,
        Body: fs.createReadStream(filePath),
        ContentType: mime.lookup(filePath),
      });

      await s3Client.send(command);
      // publishLog(`uploaded ${file}`);
      console.log("uploaded", filePath);
    }
    // publishLog(`Done`);
    console.log("Done...");
  });
}

init();
