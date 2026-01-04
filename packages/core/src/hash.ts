import { CryptoHasher } from "bun";

const trailingWhitespace = /[\t ]+$/gm;
const lineEndings = /\r\n?/g;
const extraBlankLines = /\n{3,}/g;

export function normalizeForHash(markdown: string): string {
  const normalized = markdown.replace(lineEndings, "\n");
  const trimmedLines = normalized.replace(trailingWhitespace, "");
  return trimmedLines.replace(extraBlankLines, "\n\n");
}

export function sha256Hex(input: string): string {
  const hasher = new CryptoHasher("sha256");
  hasher.update(input);
  return bytesToHex(hasher.digest());
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}
