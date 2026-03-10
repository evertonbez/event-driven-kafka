import { Schema, type Document, model, type Types } from "mongoose";

export enum OrderStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  PROCESSING = "processing",
  SHIPPED = "shipped",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
  REFUNDED = "refunded",
}

export interface IOrderItem {
  productId: Types.ObjectId | string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface IOrder {
  customerId: Types.ObjectId | string;
  status: OrderStatus;
  items: IOrderItem[];
  totalAmount: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrderDocument extends IOrder, Document {}

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderSchema = new Schema<IOrderDocument>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING,
      required: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items: IOrderItem[]) => items.length > 0,
        message: "Order must have at least one item",
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "orders",
  },
);

orderSchema.virtual("itemCount").get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

orderSchema.methods.isCancellable = function (): boolean {
  return [OrderStatus.PENDING, OrderStatus.CONFIRMED].includes(this.status);
};

orderSchema.methods.cancel = async function (): Promise<IOrderDocument> {
  if (!this.isCancellable()) {
    throw new Error(`Order cannot be cancelled in status "${this.status}"`);
  }
  this.status = OrderStatus.CANCELLED;
  return this.save();
};

orderSchema.statics.findByCustomer = function (customerId: string) {
  return this.find({ customerId }).sort({ createdAt: -1 });
};

orderSchema.statics.findByStatus = function (status: OrderStatus) {
  return this.find({ status }).sort({ createdAt: -1 });
};

export const Order = model<IOrderDocument>("Order", orderSchema);
