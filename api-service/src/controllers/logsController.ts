import { Request, Response } from "express";
import { createClient } from "@clickhouse/client";

const client = createClient({
  host: process.env.CLICKHOUSE_HOST,
  database: "default",
  username: process.env.CLICKHOUSE_USERNAME,
  password: process.env.CLICKHOUSE_PASSWORD,
});

export const getLogs = async (req: Request, res: Response) => {
  const id = req.params.id;
  const logs = await client.query({
    query: `SELECT event_id, deployment_id, log, timestamp from log_events where deployment_id = {deployment_id:String}`,
    query_params: {
      deployment_id: id,
    },
    format: "JSONEachRow",
  });

  const rawLogs = await logs.json();

  return res.json({ logs: rawLogs });
};
