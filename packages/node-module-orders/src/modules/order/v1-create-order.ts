import type { Context } from "hono";
import { z } from "zod";
import { orderRepository, OrderStatus } from "./model-order";
import logger from "../../utils/logger";
import { publishMessage } from "../../kafka/kafka-server";

const createOrderSchema = z.object({
  customerId: z.string().min(1, "customerId is required"),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "productId is required"),
        name: z.string().min(1, "item name is required"),
        quantity: z.number().int().min(1, "quantity must be at least 1"),
        unitPrice: z.number().min(0, "unitPrice must be non-negative"),
      }),
    )
    .min(1, "Order must have at least one item"),
  notes: z.string().max(500).optional(),
});

export type CreateOrderBody = z.infer<typeof createOrderSchema>;

export const v1CreateOrder = async (c: Context) => {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ success: false, error: "Invalid JSON body" }, 400);
  }

  const parsed = createOrderSchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ success: false }, 422);
  }

  const { customerId, items, notes } = parsed.data;

  const totalAmount = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );

  try {
    const order = await orderRepository.create({
      customerId,
      items,
      totalAmount,
      notes,
      status: OrderStatus.PENDING,
    });

    await publishMessage("order.created", {
      id: order.id,
      customerId: order.customerId,
      status: order.status,
    });

    logger.info("[Order] Created", { orderId: order.id, customerId });

    return c.json(
      {
        success: true,
        data: {
          id: order.id,
          customerId: order.customerId,
          status: order.status,
          items: order.items,
          totalAmount: order.totalAmount,
          notes: order.notes,
          createdAt: order.createdAt,
        },
      },
      201,
    );
  } catch (err) {
    logger.error("[Order] Failed to create order", {
      error: (err as Error).message,
      customerId,
    });
    return c.json({ success: false, error: "Internal server error" }, 500);
  }
};
