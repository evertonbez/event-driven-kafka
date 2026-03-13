import { OpenAPIHono } from "@hono/zod-openapi";
import { routers } from "./modules/routers";
import { secureHeaders } from "hono/secure-headers";
import { httpLogger } from "./utils/http-logger";
import { createMongoDBInstance } from "./db/mongodb";
import { connectKafka, waitForKafkaReady } from "./kafka/kafka-server";
import { startConsumers } from "./kafka/consumer";

await createMongoDBInstance();
await connectKafka();
await waitForKafkaReady();
await startConsumers();

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
  port: process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3200,
  fetch: app.fetch,
  host: "0.0.0.0",
  idleTimeout: 60,
};
