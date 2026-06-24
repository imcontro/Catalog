import { scryptSync, timingSafeEqual } from "node:crypto";

const PASSWORD_HASH_PREFIX = "scrypt";
const SCRYPT_KEY_LENGTH = 64;

export function verifyAdminPassword(password: string, passwordHash: string) {
  const parsedHash = parsePasswordHash(passwordHash);

  if (!parsedHash) {
    return false;
  }

  const candidateHash = scryptSync(
    password,
    parsedHash.salt,
    parsedHash.expectedHash.length
  );

  return timingSafeEqual(candidateHash, parsedHash.expectedHash);
}

function parsePasswordHash(passwordHash: string) {
  const [prefix, saltHex, hashHex] = passwordHash.split(":");

  if (
    prefix !== PASSWORD_HASH_PREFIX ||
    !isHex(saltHex) ||
    !isHex(hashHex) ||
    hashHex.length !== SCRYPT_KEY_LENGTH * 2
  ) {
    return null;
  }

  return {
    salt: Buffer.from(saltHex, "hex"),
    expectedHash: Buffer.from(hashHex, "hex")
  };
}

function isHex(value: string | undefined) {
  return typeof value === "string" && value.length > 0 && /^[0-9a-f]+$/i.test(value);
}
