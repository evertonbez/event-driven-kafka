export interface TopicConfig {
  topic: string;
  numPartitions: number;
  replicationFactor: number;
  configEntries?: { name: string; value: string }[];
}

export const TOPICS = {
  ORDER_CREATED: "order-created",
  ORDER_UPDATED: "order-updated",
  ORDER_CANCELLED: "order-cancelled",
  ORDER_DEAD_LETTER: "order-dlq",
} as const;

export type TopicName = (typeof TOPICS)[keyof typeof TOPICS];

export const TOPIC_CONFIGS: TopicConfig[] = [
  {
    topic: TOPICS.ORDER_CREATED,
    numPartitions: -1,
    replicationFactor: 1,
    configEntries: [
      { name: "retention.ms", value: "2592000000" },
      { name: "cleanup.policy", value: "delete" },
    ],
  },
  {
    topic: TOPICS.ORDER_UPDATED,
    numPartitions: -1,
    replicationFactor: 1,
    configEntries: [{ name: "retention.ms", value: "2592000000" }],
  },
  {
    topic: TOPICS.ORDER_CANCELLED,
    numPartitions: -1,
    replicationFactor: 1,
    configEntries: [{ name: "retention.ms", value: "2592000000" }],
  },

  {
    topic: TOPICS.ORDER_DEAD_LETTER,
    numPartitions: 1,
    replicationFactor: 1,
    configEntries: [
      { name: "retention.ms", value: "2592000000" },
      { name: "cleanup.policy", value: "delete" },
    ],
  },
];
