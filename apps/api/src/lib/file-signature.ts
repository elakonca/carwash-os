import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { UnprocessableEntityError } from "./errors.js";

const DANGEROUS_EXTENSIONS = new Set([
  ".php",
  ".phtml",
  ".phar",
  ".exe",
  ".dll",
  ".so",
  ".sh",
  ".bat",
  ".cmd",
  ".js",
  ".mjs",
  ".cjs",
  ".html",
  ".htm",
  ".svg",
  ".jsp",
  ".asp",
  ".aspx",
  ".cgi",
  ".py",
  ".rb",
  ".pl",
  ".jar",
  ".war",
]);

type DetectedImage = { ext: ".jpg" | ".png" | ".gif" | ".webp"; mime: string };

export function hasDangerousExtension(filename: string): boolean {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  const parts = base.toLowerCase().split(".");
  if (parts.length < 2) return false;
  return parts.slice(1).some((part) => DANGEROUS_EXTENSIONS.has(`.${part}`));
}

export function detectImage(buffer: Buffer): DetectedImage | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: ".jpg", mime: "image/jpeg" };
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { ext: ".png", mime: "image/png" };
  }
  if (buffer.length >= 6) {
    const header = buffer.subarray(0, 6).toString("ascii");
    if (header === "GIF87a" || header === "GIF89a") {
      return { ext: ".gif", mime: "image/gif" };
    }
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { ext: ".webp", mime: "image/webp" };
  }
  return null;
}

export async function persistVerifiedImage(file: Express.Multer.File, uploadDir: string) {
  if (hasDangerousExtension(file.originalname || "")) {
    throw new UnprocessableEntityError("Dangerous file extension is not allowed", "DANGEROUS_EXTENSION");
  }
  const detected = detectImage(file.buffer);
  if (!detected) {
    throw new UnprocessableEntityError("File signature is not an allowed image", "INVALID_FILE_SIGNATURE");
  }
  await fs.mkdir(uploadDir, { recursive: true });
  const filename = `${randomUUID()}${detected.ext}`;
  await fs.writeFile(path.join(uploadDir, filename), file.buffer);
  return { filename, mime: detected.mime };
}
