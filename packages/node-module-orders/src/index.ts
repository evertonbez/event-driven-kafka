import { OpenAPIHono } from "@hono/zod-openapi";
import { routers } from "./modules/routers";
import { secureHeaders } from "hono/secure-headers";
import { httpLogger } from "./utils/http-logger";
import { createMongoDBInstance } from "./db/mongodb";
import { connectKafka } from "./kafka/kafka-server";

await Promise.all([createMongoDBInstance(), connectKafka()]);

const app = new OpenAPIHono();

app.use(httpLogger());
app.use(
  secureHeaders({
    crossOriginResourcePolicy: "cross-origin",
  }),
);

app.get("/health", (c) => c.json({ status: "ok" }, 200));
app.route("/", routers);

export default {
  port: process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000,
  fetch: app.fetch,
  host: "0.0.0.0",
  idleTimeout: 60,
};
