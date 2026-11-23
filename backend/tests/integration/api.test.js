import { describe, it, expect, vi } from "vitest";
import request from "supertest";

// Mock DB and external services before importing app
vi.mock("../../utils/db.js", () => ({
  default: vi.fn(),
}));

vi.mock("../../config/redis.js", () => ({
  connectRedis: vi.fn(),
  getCache: vi.fn().mockResolvedValue(null),
  setCache: vi.fn(),
  deleteKeysByPattern: vi.fn(),
}));

vi.mock("../../config/kafka.js", () => ({
  connectKafka: vi.fn(),
  sendNotificationEvent: vi.fn(),
}));

vi.mock("../../workers/notificationWorker.js", () => ({
  initNotificationWorker: vi.fn(),
}));

// Import configured express app
import { app } from "../../index.js";

describe("Backend API Integration Tests", () => {
  describe("GET /", () => {
    it("should return 200 and health message", async () => {
      const response = await request(app).get("/");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: "I'm coming from backend",
        success: true,
      });
    });
  });

  describe("POST /api/v1/user/register - Request Validation", () => {
    it("should return 401 when fields are missing", async () => {
      const response = await request(app)
        .post("/api/v1/user/register")
        .send({ username: "testuser" });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Something is missing, please check!");
    });
  });

  describe("POST /api/v1/user/login - Request Validation", () => {
    it("should return 401 when email or password is missing", async () => {
      const response = await request(app)
        .post("/api/v1/user/login")
        .send({ email: "test@example.com" });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Something is missing, please check!");
    });
  });

  describe("Protected Endpoints without Auth Token", () => {
    it("should reject unauthenticated access to /api/v1/user/suggested with 401", async () => {
      const response = await request(app).get("/api/v1/user/suggested");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("User not authenticated");
    });

    it("should reject unauthenticated access to /api/v1/post/all with 401", async () => {
      const response = await request(app).get("/api/v1/post/all");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("User not authenticated");
    });
  });
});
