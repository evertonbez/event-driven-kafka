import mongoose, { Mongoose } from "mongoose";
import { config } from "../config";
import { logger } from "../utils/logger";

interface MongoDB {
  connection: mongoose.Connection;
  instance: Mongoose;
}

let mongodbInstance: Mongoose | null = null;
let mongodbConnection: mongoose.Connection | null = null;

function registerConnectionEvents(connection: mongoose.Connection): void {
  connection.on("connected", () =>
    logger.info("[MongoDB] Connected to database"),
  );

  connection.on("open", () =>
    logger.info("[MongoDB] Connection open and ready"),
  );

  connection.on("disconnected", () =>
    logger.warn("[MongoDB] Disconnected from database"),
  );

  connection.on("reconnected", () =>
    logger.info("[MongoDB] Reconnected to database"),
  );

  connection.on("error", (err) =>
    logger.error("[MongoDB] Connection error", { error: err.message }),
  );

  connection.on("close", () => logger.info("[MongoDB] Connection closed"));
}

export async function createMongoDBInstance(): Promise<void> {
  if (mongodbInstance) {
    logger.warn("[MongoDB] Instance already exists, skipping reconnection");
    return;
  }

  mongoose.set("debug", config.isDevelopment);
  mongoose.set("strictQuery", false);

  try {
    mongodbInstance = await mongoose.connect(config.mongodb.uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    mongodbConnection = mongodbInstance.connection;

    registerConnectionEvents(mongodbConnection);

    await mongoose.syncIndexes();
    logger.info("[MongoDB] All indexes synced");
  } catch (err) {
    mongodbInstance = null;
    mongodbConnection = null;
    logger.error("[MongoDB] Failed to connect", {
      error: (err as Error).message,
    });
    throw err;
  }
}

export async function closeMongoDBConnection(): Promise<void> {
  if (!mongodbConnection) {
    logger.warn("[MongoDB] No active connection to close");
    return;
  }

  try {
    await mongodbConnection.close();
    mongodbInstance = null;
    mongodbConnection = null;
    logger.info("[MongoDB] Connection closed gracefully");
  } catch (err) {
    logger.error("[MongoDB] Error while closing connection", {
      error: (err as Error).message,
    });
    throw err;
  }
}

export function getMongoDB(): MongoDB {
  if (!mongodbInstance || !mongodbConnection) {
    throw new Error(
      "[MongoDB] Not connected. Call createMongoDBInstance() first.",
    );
  }

  return {
    instance: mongodbInstance,
    connection: mongodbConnection,
  };
}

export function isMongoDBConnected(): boolean {
  return mongodbConnection?.readyState === mongoose.ConnectionStates.connected;
}
