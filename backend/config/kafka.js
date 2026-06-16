// import { Kafka } from "kafkajs";
import dotenv from "dotenv";
import { Notification } from "../models/notification.model.js";
import { io } from "../socket/socket.js";

dotenv.config();

// PAUSED KAFKA
/*
const kafka = new Kafka({
  clientId: "insta-app",
  brokers: [process.env.KAFKA_BOOTSTRAP_SERVER || "localhost:9092"],
  ssl: !!process.env.KAFKA_API_KEY,
  sasl: process.env.KAFKA_API_KEY ? {
    mechanism: "plain",
    username: process.env.KAFKA_API_KEY,
    password: process.env.KAFKA_API_SECRET,
  } : undefined,
});

export const producer = kafka.producer();
export const consumer = kafka.consumer({ groupId: "insta-notification-group" });
*/

export const connectKafka = async () => {
  console.log("Kafka is paused. Skipping connection.");
};

export const sendNotificationEvent = async (type, data) => {
    try {
        console.log(`Processing ${type} event synchronously (Kafka bypassed)`);
        
        // 1. Create Notification in MongoDB
        const notification = await Notification.create({
            receiver: data.receiver,
            sender: data.sender,
            type: data.type,
            post: data.post,
            comment: data.comment,
            message: data.message
        });

        // 2. Fetch unread count from MongoDB
        const unreadCount = await Notification.countDocuments({ receiver: data.receiver, isRead: false });

        // 3. Populate notification for real-time delivery
        const populatedNotification = await Notification.findById(notification._id)
            .populate('sender', 'username profilePicture')
            .populate('post', 'image mediaType');

        // 4. Emit Socket.io event
        io.to(`user:${data.receiver}`).emit('notification', {
            ...populatedNotification.toObject(),
            unreadCount
        });

    } catch (error) {
        console.error("Error processing notification event:", error);
    }
};
