import { Hono } from "hono";
import { orderRouter } from "./order";

const routers = new Hono();

routers.route("/orders", orderRouter);

export { routers };
