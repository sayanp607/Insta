import { createClient } from "redis";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env"), override: true });

const redisClient = createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
        reconnectStrategy: (retries, cause) => {
            if (cause?.code === "ENOTFOUND" || retries >= 3) {
                return false;
            }
            return Math.min(retries * 200, 2000);
        }
    }
});

redisClient.on("error", (err) => {
    console.log("Redis Client Error", err);
});

export const connectRedis = async () => {
    if (!redisClient.isOpen) {
        try {
            await redisClient.connect();
            console.log("Connected to Redis");
        } catch (err) {
            console.log("Redis unavailable, continuing without cache:", err.message);
        }
    }
};

export const getCache = async (key) => {
    if (!redisClient.isOpen) return null;
    try {
        return await redisClient.get(key);
    } catch {
        return null;
    }
};

export const setCache = async (key, ttlSeconds, value) => {
    if (!redisClient.isOpen) return;
    try {
        await redisClient.setEx(key, ttlSeconds, value);
    } catch {
        // Cache is optional; MongoDB remains the source of truth.
    }
};

export default redisClient;
