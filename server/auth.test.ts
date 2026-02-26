import { describe, it, expect } from "vitest";
import { hashPassword, comparePasswords } from "./auth";

describe("Password hashing", () => {
  it("hashes a password and verifies it correctly", async () => {
    const password = "testPassword123!";
    const hashed = await hashPassword(password);

    // Hash format should be hex.hex (hash.salt)
    expect(hashed).toContain(".");
    const [hash, salt] = hashed.split(".");
    expect(hash.length).toBe(128); // 64 bytes = 128 hex chars
    expect(salt.length).toBe(32); // 16 bytes = 32 hex chars

    // Correct password should verify
    const isValid = await comparePasswords(password, hashed);
    expect(isValid).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hashed = await hashPassword("correctPassword");
    const isValid = await comparePasswords("wrongPassword", hashed);
    expect(isValid).toBe(false);
  });

  it("generates unique salts for each hash", async () => {
    const hash1 = await hashPassword("samePassword");
    const hash2 = await hashPassword("samePassword");

    // Different salts should produce different hashes
    expect(hash1).not.toBe(hash2);

    // But both should verify against the same password
    expect(await comparePasswords("samePassword", hash1)).toBe(true);
    expect(await comparePasswords("samePassword", hash2)).toBe(true);
  });
});
