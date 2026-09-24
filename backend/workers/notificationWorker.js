import { Worker } from "bullmq";
import { redisConnection } from "../config/bullmq.js";
import { Notification } from "../models/notification.model.js";
import { io } from "../socket/socket.js";

let worker = null;

export const initNotificationWorker = () => {
    if (worker) return worker;

    worker = new Worker(
        "notification-queue",
        async (job) => {
            const data = job.data;
            console.log(`⚙️ [BullMQ Worker] Processing notification job: ${job.name}`);

            try {
                // 1. Create Notification in MongoDB
                const notification = await Notification.create({
                    receiver: data.receiver,
                    sender: data.sender,
                    type: data.type || job.name,
                    post: data.post,
                    comment: data.comment,
                    message: data.message
                });

                // 2. Fetch unread count from MongoDB
                const unreadCount = await Notification.countDocuments({
                    receiver: data.receiver,
                    isRead: false
                });

                // 3. Populate notification for real-time delivery
                const populatedNotification = await Notification.findById(notification._id)
                    .populate('sender', 'username profilePicture')
                    .populate('post', 'image mediaType');

                // 4. Emit Socket.io event to the receiver
                if (io) {
                    io.to(`user:${data.receiver}`).emit('notification', {
                        ...populatedNotification.toObject(),
                        unreadCount
                    });
                }

                console.log(`✅ [BullMQ Worker] Delivered notification to user:${data.receiver}`);
            } catch (error) {
                console.error("❌ Error processing notification in BullMQ worker:", error);
                throw error;
            }
        },
        { connection: redisConnection }
    );

    worker.on("completed", (job) => {
        console.log(`🎉 [BullMQ Worker] Job ${job.id} completed`);
    });

    worker.on("failed", (job, err) => {
        console.error(`❌ [BullMQ Worker] Job ${job?.id} failed: ${err.message}`);
    });

    console.log("🚀 BullMQ Notification Worker initialized and ready.");
    return worker;
};
