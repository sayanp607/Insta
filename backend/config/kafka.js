// Kafka configuration re-routed to BullMQ Queue Engine
import { sendNotificationEvent as sendBullMQNotification } from "../queues/notificationQueue.js";

export const connectKafka = async () => {
    console.log("⚡ Queue Engine: Using BullMQ + Redis for background notifications.");
};

export const sendNotificationEvent = sendBullMQNotification;
