import {
  Kafka,
  type Producer,
  type Consumer,
  logLevel,
  CompressionTypes,
} from "kafkajs";
import { config } from "../config";

import { TOPIC_CONFIGS, type TopicName } from "./topics";
import logger from "../utils/logger";

const kafkaConfig = config.kafka;

const kafka = new Kafka({
  clientId: config.name,
  brokers: kafkaConfig.brokers,
  connectionTimeout: kafkaConfig.connectionTimeout,
  retry: {
    initialRetryTime: 100,
    retries: kafkaConfig.maxReconnectAttempts,
  },
  logLevel: logLevel.ERROR,
});

const admin = kafka.admin();
let producer: Producer;
const consumers: Map<string, Consumer> = new Map();

export async function ensureTopicsExist(): Promise<void> {
  try {
    await admin.connect();

    const existingTopics = await admin.listTopics();
    const missingTopics = TOPIC_CONFIGS.filter(
      ({ topic }) => !existingTopics.includes(topic),
    );

    if (missingTopics.length === 0) {
      logger.info("[Kafka] All topics already exist");
      return;
    }

    await admin.createTopics({
      waitForLeaders: true,
      topics: missingTopics.map(
        ({ topic, numPartitions, replicationFactor, configEntries }) => ({
          topic,
          numPartitions,
          replicationFactor,
          configEntries,
        }),
      ),
    });

    logger.info(
      `[Kafka] Created ${missingTopics.length} topic(s): ${missingTopics.map((t) => t.topic).join(", ")}`,
    );
  } catch (err) {
    logger.error("[Kafka] Failed to ensure topics exist", err as Error);
    throw err;
  } finally {
    await admin.disconnect();
  }
}

export async function connectProducer(): Promise<void> {
  if (producer) return;

  producer = kafka.producer({
    allowAutoTopicCreation: false,
    idempotent: true,
    retry: {
      initialRetryTime: 100,
      retries: kafkaConfig.maxReconnectAttempts,
    },
  });

  try {
    await producer.connect();
    logger.info("[Kafka] Producer connected");
  } catch (err) {
    logger.error("[Kafka] Producer failed to connect", err as Error);
    throw err;
  }
}

export async function disconnectProducer(): Promise<void> {
  if (!producer) return;
  try {
    await producer.disconnect();
    logger.info("[Kafka] Producer disconnected");
  } catch (err) {
    logger.error("[Kafka] Error disconnecting producer", err as Error);
  }
}

export async function publishMessage<T>(
  topic: TopicName,
  payload: T,
  key?: string,
): Promise<void> {
  if (!producer) throw new Error("[Kafka] Producer is not connected");

  const message = {
    key: key ?? undefined,
    value: JSON.stringify(payload),
    timestamp: Date.now().toString(),
  };

  try {
    await producer.send({
      topic,
      compression: CompressionTypes.GZIP,
      messages: [message],
    });
    logger.debug(`[Kafka] Message published to "${topic}"`, { key });
  } catch (err) {
    logger.error(
      `[Kafka] Failed to publish message to "${topic}"`,
      err as Error,
    );
    throw err;
  }
}

export async function publishBatch<T>(
  messages: { topic: TopicName; payload: T; key?: string }[],
): Promise<void> {
  if (!producer) throw new Error("[Kafka] Producer is not connected");

  const topicMessages = messages.reduce<
    Record<string, { key: string | null; value: string; timestamp: string }[]>
  >((acc, { topic, payload, key }) => {
    if (!acc[topic]) acc[topic] = [];
    acc[topic].push({
      key: key ?? null,
      value: JSON.stringify(payload),
      timestamp: Date.now().toString(),
    });
    return acc;
  }, {});

  try {
    await producer.sendBatch({
      compression: CompressionTypes.GZIP,
      topicMessages: Object.entries(topicMessages).map(([topic, msgs]) => ({
        topic,
        messages: msgs,
      })),
    });
    logger.debug(`[Kafka] Batch published (${messages.length} messages)`);
  } catch (err) {
    logger.error("[Kafka] Failed to publish batch", err as Error);
    throw err;
  }
}

export async function createConsumer(groupId: string): Promise<Consumer> {
  if (consumers.has(groupId)) return consumers.get(groupId)!;

  const consumer = kafka.consumer({
    groupId,
    retry: {
      initialRetryTime: 100,
      retries: kafkaConfig.maxReconnectAttempts,
    },
  });

  try {
    await consumer.connect();
    consumers.set(groupId, consumer);
    logger.info(`[Kafka] Consumer connected (group: ${groupId})`);
    return consumer;
  } catch (err) {
    logger.error(
      `[Kafka] Consumer failed to connect (group: ${groupId})`,
      err as Error,
    );
    throw err;
  }
}

export async function disconnectConsumer(groupId: string): Promise<void> {
  const consumer = consumers.get(groupId);
  if (!consumer) return;

  try {
    await consumer.disconnect();
    consumers.delete(groupId);
    logger.info(`[Kafka] Consumer disconnected (group: ${groupId})`);
  } catch (err) {
    logger.error(
      `[Kafka] Error disconnecting consumer (group: ${groupId})`,
      err as Error,
    );
  }
}

export async function connectKafka(): Promise<void> {
  await ensureTopicsExist();
  await connectProducer();
}

export async function disconnectKafka(): Promise<void> {
  await disconnectProducer();
  await Promise.all([...consumers.keys()].map(disconnectConsumer));
  logger.info("[Kafka] All connections closed");
}

const RETRY_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 10;

export async function waitForKafkaReady(): Promise<void> {
  const admin = kafka.admin();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await admin.connect();
      await admin.listTopics(); // valida que o broker está realmente pronto
      await admin.disconnect();

      logger.info("[Kafka] Broker is ready");
      return;
    } catch {
      logger.warn(
        `[Kafka] Broker not ready, retrying... (${attempt}/${MAX_ATTEMPTS})`,
      );
      await new Promise((res) => setTimeout(res, RETRY_INTERVAL_MS));
    }
  }

  throw new Error("[Kafka] Broker did not become ready in time");
}

export { producer };
