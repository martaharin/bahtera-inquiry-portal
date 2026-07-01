// src/lib/crypto.ts
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey() {
  const key = (process.env.ENCRYPTION_KEY || "").trim();

  console.log("ENCRYPTION_KEY LENGTH:", key.length);

  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY harus sepanjang 32 karakter! Saat ini terbaca ${key.length} karakter.`
    );
  }

  return Buffer.from(key, "utf8");
}

export function encrypt(text: string): string {
  const key = getEncryptionKey();

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  try {
    const key = getEncryptionKey();

    const [ivHex, authTagHex, encrypted] = encryptedText.split(":");

    if (!ivHex || !authTagHex || !encrypted) return "";

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Gagal melakukan dekripsi:", error);
    return "";
  }
}