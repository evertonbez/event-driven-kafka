import { Schema, type Document, model } from "mongoose";

export interface ICustomer {
  name: string;
  email: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICustomerDocument extends ICustomer, Document {}

const customerSchema = new Schema<ICustomerDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      trim: true,
      require: true,
      lowercase: true,
      unique: true,
    },
    phone: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "customers",
  },
);

customerSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email });
};

export const customerRepository = model<ICustomerDocument>(
  "Customer",
  customerSchema,
);
