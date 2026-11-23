import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import isAuthenticated from "../../middlewares/isAuthenticated.js";

describe("Middleware: isAuthenticated", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      cookies: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
    process.env.SECRET_KEY = "test_secret_key_for_testing";
  });

  it("should return 401 if no token is provided in cookies", async () => {
    await isAuthenticated(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "User not authenticated",
      success: false,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next() and set req.id when a valid token is provided", async () => {
    const token = jwt.sign({ userId: "user_123" }, process.env.SECRET_KEY);
    req.cookies.token = token;

    await isAuthenticated(req, res, next);

    expect(req.id).toBe("user_123");
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should return 401 if token is invalid or corrupted", async () => {
    req.cookies.token = "invalid_token_string";

    await isAuthenticated(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid or expired token",
      success: false,
    });
    expect(next).not.toHaveBeenCalled();
  });
});
