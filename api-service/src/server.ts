import app from "./app";
import { config } from "./config";
import { systemLog } from "./utils/logger";
import { initKafkaConsumer } from "./services/kafkaService";

initKafkaConsumer();

app.listen(config.port, () => {
  systemLog({
    component: "SERVER",
    event: "Server started",
    details: {
      port: config.port,
      environment: process.env.NODE_ENV,
      version: process.env.APP_VERSION,
    },
  });
});
