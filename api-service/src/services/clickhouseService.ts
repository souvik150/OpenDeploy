import { createClient } from "@clickhouse/client";
import { config } from "../config";

export const client = createClient({
  host: config.clickhouse.host,
  database: "default",
  username: config.clickhouse.username,
  password: config.clickhouse.password,
});
