import { describe, it, expect, vi, beforeEach } from "vitest";
import { register, login } from "../../controllers/user.controller.js";
import { User } from "../../models/user.model.js";
import bcrypt from "bcryptjs";

vi.mock("../../models/user.model.js", () => ({
  User: {
    findOne: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

vi.mock("../../socket/socket.js", () => ({
  io: {
    emit: vi.fn(),
    to: vi.fn().mockReturnValue({ emit: vi.fn() }),
  },
  getReceiverSocketId: vi.fn(),
}));

describe("Controller: user.controller unit tests", () => {
  let req;
  let res;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      body: {},
      cookies: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      cookie: vi.fn().mockReturnThis(),
    };
    process.env.SECRET_KEY = "test_jwt_secret";
  });

  describe("register", () => {
    it("should return 401 if username, email, or password is missing", async () => {
      req.body = { username: "alice", email: "" };

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Something is missing, please check!",
          success: false,
        })
      );
    });

    it("should return 401 if user email already exists", async () => {
      req.body = { username: "alice", email: "alice@test.com", password: "password123" };
      User.findOne.mockResolvedValueOnce({ _id: "existing_id", email: "alice@test.com" });

      await register(req, res);

      expect(User.findOne).toHaveBeenCalledWith({ email: "alice@test.com" });
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Try different email",
          success: false,
        })
      );
    });

    it("should hash password and create new user on valid input", async () => {
      req.body = { username: "bob", email: "bob@test.com", password: "secretPassword" };
      User.findOne.mockResolvedValueOnce(null);
      bcrypt.hash.mockResolvedValueOnce("hashed_password_xyz");
      User.create.mockResolvedValueOnce({
        _id: "new_bob_id",
        username: "bob",
        email: "bob@test.com",
        password: "hashed_password_xyz",
      });

      await register(req, res);

      expect(bcrypt.hash).toHaveBeenCalledWith("secretPassword", 10);
      expect(User.create).toHaveBeenCalledWith({
        username: "bob",
        email: "bob@test.com",
        password: "hashed_password_xyz",
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Account created successfully.",
          success: true,
        })
      );
    });
  });

  describe("login", () => {
    it("should return 401 if email or password is missing", async () => {
      req.body = { email: "user@test.com" };

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Something is missing, please check!",
          success: false,
        })
      );
    });

    it("should return 401 if user does not exist", async () => {
      req.body = { email: "unknown@test.com", password: "pwd" };
      User.findOne.mockResolvedValueOnce(null);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Incorrect email or password",
          success: false,
        })
      );
    });

    it("should return 401 if password does not match", async () => {
      req.body = { email: "alice@test.com", password: "wrong_password" };
      User.findOne.mockResolvedValueOnce({
        _id: "user_alice",
        email: "alice@test.com",
        password: "real_hashed_password",
      });
      bcrypt.compare.mockResolvedValueOnce(false);

      await login(req, res);

      expect(bcrypt.compare).toHaveBeenCalledWith("wrong_password", "real_hashed_password");
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Incorrect email or password",
          success: false,
        })
      );
    });
  });
});
