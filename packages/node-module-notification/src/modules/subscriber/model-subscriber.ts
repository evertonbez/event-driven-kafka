import { Schema, type Document, model } from "mongoose";

export interface ISubscriber {
  email: string;
  active: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISubscriberDocument extends ISubscriber, Document {}

const subscriberSchema = new Schema<ISubscriberDocument>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "subscribers",
  },
);

subscriberSchema.index({ email: 1 });

subscriberSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email });
};

export const subscriberRepository = model<ISubscriberDocument>(
  "Subscriber",
  subscriberSchema,
);
