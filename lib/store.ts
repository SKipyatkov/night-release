import { promises as fs } from "fs";
import path from "path";
import type { GamePhase, Skill } from "./types";

export interface AttemptState {
  startedAt: number;
  wrongAttempts: number;
  hintUsed: boolean;
  solved: boolean;
  revealed: boolean;
  points: number;
}

export interface PlayerRecord {
  id: string;
  name: string;
  school: string;
  grade: string;
  seed: string;
  createdAt: number;
  finishedAt?: number;
  phase: GamePhase;
  requiredQueue: string[];
  bonusQueue: string[];
  requiredIndex: number;
  bonusIndex: number;
  currentLevelId?: string;
  attempts: Record<string, AttemptState>;
  earnedSkills: Skill[];
}

export interface GameSettings {
  registrationOpen: boolean;
}

export interface Database {
  settings: GameSettings;
  players: PlayerRecord[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "players.json");

const emptyDb = (): Database => ({
  settings: { registrationOpen: true },
  players: [],
});

let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readDb(): Promise<Database> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Database;
    if (!parsed.settings || !Array.isArray(parsed.players)) return emptyDb();
    return parsed;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return emptyDb();
    throw error;
  }
}

async function writeDb(db: Database): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, DATA_FILE);
}

export function withStore<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  return enqueue(async () => {
    const db = await readDb();
    const result = await fn(db);
    await writeDb(db);
    return result;
  });
}

export function readStore<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  return enqueue(async () => fn(await readDb()));
}
