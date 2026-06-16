import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

console.log("Testing with password only...");
const client1 = createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT)
    }
});
client1.on("error", (err) => console.log("Client 1 error:", err.message));

client1.connect().then(() => {
    console.log("Client 1 connected successfully!");
    client1.disconnect();
}).catch(err => console.log("Client 1 connect catch:", err.message));

console.log("Testing with username 'default'...");
const client2 = createClient({
    username: 'default',
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT)
    }
});
client2.on("error", (err) => console.log("Client 2 error:", err.message));

client2.connect().then(() => {
    console.log("Client 2 connected successfully!");
    client2.disconnect();
}).catch(err => console.log("Client 2 connect catch:", err.message));

console.log("Testing with URL format...");
const url = `redis://default:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;
const client3 = createClient({ url });
client3.on("error", (err) => console.log("Client 3 error:", err.message));

client3.connect().then(() => {
    console.log("Client 3 connected successfully!");
    client3.disconnect();
}).catch(err => console.log("Client 3 connect catch:", err.message));

