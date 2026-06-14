import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const PREFIX = "scrypt";
const SALT_LEN = 16;
const KEY_LEN = 64;

export function isPasswordHash(stored) {
  return typeof stored === "string" && stored.startsWith(`${PREFIX}$`);
}

export function hashPassword(plain) {
  const salt = randomBytes(SALT_LEN);
  const hash = scryptSync(plain, salt, KEY_LEN);
  return `${PREFIX}$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export function verifyPassword(plain, stored) {
  if (!stored || typeof plain !== "string") return false;

  if (!isPasswordHash(stored)) {
    return plain === stored;
  }

  const parts = stored.split("$");
  if (parts.length !== 3) return false;

  const salt = Buffer.from(parts[1], "base64url");
  const expected = Buffer.from(parts[2], "base64url");
  const actual = scryptSync(plain, salt, expected.length);

  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
