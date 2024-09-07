import { Kafka } from "kafkajs";
import fs from "fs";
import path from "path";
import { config } from "../config";
import { client as clickhouseClient } from "./clickhouseService";
import { v4 as uuidv4 } from "uuid";

const kafka = new Kafka({
  clientId: `api-server`,
  brokers: [config.kafka.broker || ""],
  ssl: {
    rejectUnauthorized: true,
    ca: [fs.readFileSync(path.join(__dirname, "../../kafka.pem"), "utf-8")],
  },
  sasl: {
    username: config.kafka.username || "",
    password: config.kafka.password || "",
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

const consumer = kafka.consumer({ groupId: "api-server-logs-consumer" });

export async function initKafkaConsumer() {
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
          const { query_id } = await clickhouseClient.insert({
            table: "log_events",
            values: [{ event_id: uuidv4(), deployment_id: DEPLOYMENT_ID, log }],
            format: "JSONEachRow",
          });
          console.log(query_id);
          resolveOffset(message.offset);
          await commitOffsetsIfNecessary();
          await heartbeat();
        } catch (err) {
          console.log(err);
        }
      }
    },
  });
}
