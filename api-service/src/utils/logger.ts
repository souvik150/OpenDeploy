import pino from "pino";
import pinoPretty from "pino-pretty";
import { Request, Response, NextFunction } from "express";

interface LogBody {
  level?: "INFO" | "WARN" | "ERROR"; // Optional log level, defaults to 'info'
  component: string; // e.g., "SERVER", "DATABASE"
  event: string; // e.g., "Server started", "Connection established"
  details: Record<string, any>; // Additional information like port, status, etc.
}

const pretty = pinoPretty({
  colorize: true,
  levelFirst: true,
  translateTime: "yyyy-mm-dd HH:MM:ss",
  ignore: "pid,hostname",
});

const logger = pino(
  {
    level: process.env.LOG_LEVEL || "info",
    formatters: {
      level: (label: string) => ({ level: label }),
    },
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
  },
  pretty
);

export const systemLog = (logBody: LogBody) => {
  const { component, event, details } = logBody;

  const detailsString = Object.entries(details)
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");

  const logMessage = `[${new Date().toISOString()}] [${component}] Event: "${event}" | Details: { ${detailsString} }`;

  logger.info(logMessage);
};

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const { ip, method, originalUrl } = req;
    const { statusCode } = res;
    const responseTime = Date.now() - startTime;
    const userAgent = req.headers["user-agent"] || "unknown";

    // Construct log message
    const logData = {
      ip,
      method,
      route: originalUrl,
      status: statusCode,
      responseTime: `${responseTime}ms`,
      userAgent,
      timestamp: new Date().toISOString(),
    };

    // Construct a professional string log
    const logMessage = `[${logData.timestamp}] [${method}] ${originalUrl} | ${responseTime}ms | ${statusCode} | IP: ${ip} | User-Agent: "${userAgent}"`;

    // Log both structured data and human-readable string
    logger.info(logMessage, logData);
  });

  next();
};

export default logger;
