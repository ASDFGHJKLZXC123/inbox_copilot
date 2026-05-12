import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  base: { service: process.env.OTEL_SERVICE_NAME ?? "ai-inbox-copilot" },
  redact: {
    paths: [
      "*.accessToken",
      "*.refreshToken",
      "*.password",
      "headers.authorization",
      "headers.cookie",
      "req.headers.authorization",
      "req.headers.cookie"
    ],
    censor: "[redacted]"
  },
  transport: isDev ? { target: "pino-pretty", options: { colorize: true } } : undefined
});
