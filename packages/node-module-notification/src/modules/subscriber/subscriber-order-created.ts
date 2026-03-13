import { registerConsumer } from "../../kafka/consumer";

const subscriberOrderCreated = registerConsumer<any>({
  groupId: "notification-service",
  topic: "order.created",
  withRetry: true,
  handler: async ({ data, topic, partition }) => {
    console.log("data", data);
    console.log("topic", topic);
    console.log("partition", partition);
  },
});

export { subscriberOrderCreated };
