import { Queue } from "bullmq";
import { redisConnection } from "../config/bullmq.js";

export const notificationQueue = new Queue("notification-queue", {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: 100,
    },
});

export const sendNotificationEvent = async (type, data) => {
    try {
        await notificationQueue.add(type, { type, ...data });
        console.log(`📥 [BullMQ] Job queued: type=${type} for user=${data.receiver}`);
    } catch (error) {
        console.error("Error pushing job to BullMQ notification queue:", error.message);
    }
};
