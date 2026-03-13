import type { Consumer, EachMessagePayload } from "kafkajs";

import { logger } from "../utils/logger";
import type { TopicName } from "./topics";
import { createConsumer, disconnectConsumer } from "./kafka-server";

export type MessageHandler<T = Record<string, unknown>> = (ctx: {
  topic: TopicName;
  partition: number;
  data: T;
  raw: EachMessagePayload;
}) => Promise<void>;

interface SubscribeToTopicParams<T = Record<string, unknown>> {
  groupId: string;
  topic: TopicName;
  fromBeginning?: boolean;
  withRetry?: boolean;
  handler: MessageHandler<T>;
}

interface SubscriberEntry {
  params: SubscribeToTopicParams;
  consumer?: Consumer;
}

const subscribers = new Map<string, SubscriberEntry>();

export function registerConsumer<T = Record<string, unknown>>(
  params: SubscribeToTopicParams<T>,
): string {
  const key = `${params.groupId}::${params.topic}`;

  if (subscribers.has(key)) {
    logger.warn(`[ConsumerManager] Subscriber already registered: ${key}`);
    return key;
  }

  subscribers.set(key, { params: params as SubscribeToTopicParams });
  logger.debug(`[ConsumerManager] Registered subscriber: ${key}`);

  return key;
}

async function runSubscriber(
  key: string,
  entry: SubscriberEntry,
): Promise<void> {
  const {
    groupId,
    topic,
    fromBeginning = false,
    withRetry = true,
    handler,
  } = entry.params;

  try {
    const consumer = await createConsumer(groupId);
    entry.consumer = consumer;

    await consumer.subscribe({ topics: [topic], fromBeginning });

    await consumer.run({
      eachMessage: async (ctx) => {
        const { partition, message } = ctx;

        if (!message.value) {
          logger.warn(
            `[ConsumerManager] Empty message received on "${topic}", skipping`,
          );
          return;
        }

        let data: Record<string, unknown>;
        try {
          data = JSON.parse(message.value.toString());
        } catch {
          logger.error(
            `[ConsumerManager] Failed to parse message on "${topic}"`,
            {
              key: message.key?.toString(),
            },
          );
          return;
        }

        try {
          await handler({ topic, partition, data, raw: ctx });
        } catch (err) {
          logger.error(`[ConsumerManager] Handler error on "${topic}"`, {
            error: (err as Error).message,
            groupId,
          });

          //   if (withRetry) {
          //     await retryConsumedMessage(topic, message);
          //   }
        }
      },
    });

    logger.info(`[ConsumerManager] Running subscriber: ${key}`);
  } catch (err) {
    logger.error(`[ConsumerManager] Failed to start subscriber: ${key}`, {
      error: (err as Error).message,
    });
    throw err;
  }
}

export async function startConsumers(): Promise<void> {
  if (subscribers.size === 0) {
    logger.warn("[ConsumerManager] No subscribers registered");
    return;
  }

  await Promise.all(
    [...subscribers.entries()].map(([key, entry]) => runSubscriber(key, entry)),
  );

  logger.info(`[ConsumerManager] All ${subscribers.size} consumer(s) started`);
}

export async function stopConsumers(): Promise<void> {
  await Promise.all(
    [...subscribers.entries()].map(async ([key, entry]) => {
      if (entry.consumer) {
        await disconnectConsumer(entry.params.groupId);
        logger.info(`[ConsumerManager] Stopped subscriber: ${key}`);
      }
    }),
  );

  subscribers.clear();
}
