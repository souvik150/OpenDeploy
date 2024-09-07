import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 8000,
  awsBucketName: process.env.AWS_BUCKET_NAME,
  basePath: `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/__outputs`,
};
