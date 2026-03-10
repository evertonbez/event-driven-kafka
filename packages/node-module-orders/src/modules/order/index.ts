import { Hono } from "hono";
import { v1CreateOrder } from "./v1-create-order";

const app = new Hono();

app.post("/", v1CreateOrder);

export const orderRouter = app;
