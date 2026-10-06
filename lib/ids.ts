import { randomBytes } from "crypto";

export function makeId(prefix: string): string {
  return `${prefix}_${randomBytes(9).toString("hex")}`;
}

export function normalizeName(value: string, max = 42): string {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}
