import { consumer } from "../config/kafka.js";
import { Notification } from "../models/notification.model.js";
import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";
import connectDB from "../utils/db.js";
import { Emitter } from "@socket.io/redis-emitter";
import { createClient } from "redis";
import redisClient from "../config/redis.js"; // Import our central redis client
import dotenv from "dotenv";

dotenv.config();

// Setup Redis Emitter to send socket events from this worker
const emitterRedisClient = createClient({
    username: 'default',
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT)
    }
});

let emitter;

const startWorker = async () => {
    try {
        await connectDB();
        await redisClient.connect().catch(() => {}); // Connect if not already connected
        await emitterRedisClient.connect();
        emitter = new Emitter(emitterRedisClient);
        console.log("Notification Worker: Connected to DB and Redis");

        await consumer.connect();
        await consumer.subscribe({ 
            topic: process.env.KAFKA_TOPIC || "insta-notifications", 
            fromBeginning: false 
        });

        console.log("Notification Worker: Subscribed to Kafka topic");

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                const { type, data } = JSON.parse(message.value.toString());
                console.log(`Processing ${type} event for ${data.receiver}`);

                try {
                    // 1. Create Notification in MongoDB
                    const notification = await Notification.create({
                        receiver: data.receiver,
                        sender: data.sender,
                        type: data.type,
                        post: data.post,
                        comment: data.comment,
                        message: data.message
                    });

                    // 2. Increment unread count in Redis
                    const unreadCount = await redisClient.incr(`user:${data.receiver}:unread_count`);

                    // 3. Populate notification for real-time delivery
                    const populatedNotification = await Notification.findById(notification._id)
                        .populate('sender', 'username profilePicture')
                        .populate('post', 'image mediaType');

                    // 4. Emit Socket.io event with the new count
                    emitter.to(`user:${data.receiver}`).emit('notification', {
                        ...populatedNotification.toObject(),
                        unreadCount // Send the fresh count from Redis
                    });
                    
                    console.log(`Processed notification and updated count (${unreadCount}) for user:${data.receiver}`);
                } catch (err) {
                    console.error("Error processing notification message:", err);
                }
            },
        });
    } catch (error) {
        console.error("Worker error:", error);
    }
};

startWorker();
