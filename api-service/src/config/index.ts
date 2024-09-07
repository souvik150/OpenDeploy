import dotenv from "dotenv";
dotenv.config();

if (!process.env.SUBNET_GROUP_IDS) {
  throw new Error("SUBNET_GROUP_IDS is required");
}

if (!process.env.SECURITY_GROUP_IDS) {
  throw new Error("SECURITY_GROUP_IDS is required");
}

export const config = {
  aws: {
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    cluster: process.env.CLUSTER_ARN,
    task: process.env.BUILDER_TASK_ARN,
    subnetGroupIds: process.env.SUBNET_GROUP_IDS.split(","),
    securityGroupIds: process.env.SECURITY_GROUP_IDS.split(","),
    builderImageName: process.env.BUILDER_IMAGE_NAME,
  },
  kafka: {
    broker: process.env.KAFKA_BROKER,
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD,
  },
  clickhouse: {
    host: process.env.CLICKHOUSE_HOST,
    username: process.env.CLICKHOUSE_USERNAME,
    password: process.env.CLICKHOUSE_PASSWORD,
  },
  port: process.env.PORT || 9000,
};
