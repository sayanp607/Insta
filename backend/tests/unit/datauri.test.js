import { describe, it, expect } from "vitest";
import getDataUri from "../../utils/datauri.js";

describe("Utility: getDataUri", () => {
  it("should convert a file object with buffer into a data uri string", () => {
    const fakeFile = {
      originalname: "avatar.png",
      buffer: Buffer.from("fake-image-bytes"),
    };

    const result = getDataUri(fakeFile);
    expect(result).toBeDefined();
    expect(result).toMatch(/^data:image\/[a-z]+;base64,/);
  });

  it("should return valid base64 payload for formatted files", () => {
    const fakeFile = {
      originalname: "document.txt",
      buffer: Buffer.from("hello world"),
    };

    const result = getDataUri(fakeFile);
    expect(result).toBeDefined();
    expect(result.startsWith("data:")).toBe(true);
  });
});
