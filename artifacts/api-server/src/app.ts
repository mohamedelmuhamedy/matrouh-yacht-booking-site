import express, { type Express } from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

const FRONTEND_TARGET = process.env["FRONTEND_PROXY_TARGET"] ?? "http://localhost:5000";

if (process.env["NODE_ENV"] !== "production") {
  app.use(
    createProxyMiddleware({
      target: FRONTEND_TARGET,
      changeOrigin: true,
      ws: true,
      logger: console,
      pathFilter: (path) => !path.startsWith("/api"),
    }),
  );
}

export default app;
