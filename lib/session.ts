import { REVEAL_AFTER_WRONG } from "./config";
import {
  BONUS_LEVEL_IDS,
  REQUIRED_LEVEL_IDS,
  checkAnswer,
  getLevel,
  isBonusLevel,
  sanitizeLevel,
  solutionLines,
} from "./levels";
import { makeId, normalizeName } from "./ids";
import { nextWrongCost, scoreLevel } from "./scoring";
import { readStore, withStore, type PlayerRecord } from "./store";
import type {
  ActionResponse,
  ActivePlayer,
  Answer,
  GameState,
  LeaderboardEntry,
  LeaderboardResponse,
  LevelProgress,
  LevelView,
  LiveStats,
  PlayerProgress,
  Skill,
} from "./types";

function playerScore(player: PlayerRecord): number {
  return Object.values(player.attempts).reduce(
    (sum, attempt) => sum + attempt.points,
    0,
  );
}

function elapsedSec(player: PlayerRecord, now = Date.now()): number {
  const end = player.finishedAt ?? now;
  return Math.max(0, Math.round((end - player.createdAt) / 1000));
}

function uniqueSkills(player: PlayerRecord): Skill[] {
  const seen = new Set<Skill>();
  const result: Skill[] = [];
  for (const skill of player.earnedSkills) {
    if (seen.has(skill)) continue;
    seen.add(skill);
    result.push(skill);
  }
  return result;
}

function queueProgress(player: PlayerRecord): LevelProgress[] {
  const ids = [...player.requiredQueue, ...player.bonusQueue];
  return ids.flatMap((levelId) => {
    const def = getLevel(levelId);
    const attempt = player.attempts[levelId];
    if (!def || !attempt) return [];
    if (!attempt.solved && !attempt.revealed) return [];
    return [
      {
        levelId,
        title: def.title,
        solved: attempt.solved,
        revealed: attempt.revealed,
        points: attempt.points,
        isBonus: isBonusLevel(levelId),
      },
    ];
  });
}

export function buildProgress(player: PlayerRecord): PlayerProgress {
  const levels = queueProgress(player);
  return {
    name: player.name,
    score: playerScore(player),
    solvedRequired: player.requiredQueue.filter(
      (id) => player.attempts[id]?.solved,
    ).length,
    totalRequired: player.requiredQueue.length,
    solvedBonus: player.bonusQueue.filter((id) => player.attempts[id]?.solved)
      .length,
    totalBonus: player.bonusQueue.length,
    elapsedSec: elapsedSec(player),
    levels,
    skills: uniqueSkills(player),
  };
}

function currentDef(player: PlayerRecord) {
  if (!player.currentLevelId) return undefined;
  return getLevel(player.currentLevelId);
}

function buildView(player: PlayerRecord, withHint = false): LevelView | undefined {
  const def = currentDef(player);
  if (!def || player.phase !== "level") return undefined;
  const attempt = player.attempts[def.id];
  if (!attempt) return undefined;
  const position = isBonusLevel(def.id)
    ? player.requiredQueue.length + player.bonusIndex + 1
    : player.requiredIndex + 1;
  return {
    level: sanitizeLevel(def, player.seed, position),
    startedAt: attempt.startedAt,
    wrongAttempts: attempt.wrongAttempts,
    hintUsed: attempt.hintUsed,
    hint: withHint || attempt.hintUsed ? def.hint : undefined,
    canReveal: attempt.wrongAttempts >= REVEAL_AFTER_WRONG,
  };
}

export function buildState(player: PlayerRecord, withHint = false): GameState {
  return {
    phase: player.phase,
    view: buildView(player, withHint),
    progress: buildProgress(player),
  };
}

function startLevel(player: PlayerRecord, levelId: string): void {
  player.currentLevelId = levelId;
  player.phase = "level";
  if (!player.attempts[levelId]) {
    player.attempts[levelId] = {
      startedAt: Date.now(),
      wrongAttempts: 0,
      hintUsed: false,
      solved: false,
      revealed: false,
      points: 0,
    };
  }
}

function finishPlayer(player: PlayerRecord): void {
  player.phase = "finished";
  player.currentLevelId = undefined;
  player.finishedAt = Date.now();
}

function advance(player: PlayerRecord): void {
  const currentId = player.currentLevelId;
  if (!currentId) {
    finishPlayer(player);
    return;
  }

  if (isBonusLevel(currentId)) {
    player.bonusIndex += 1;
    const next = player.bonusQueue[player.bonusIndex];
    if (next) startLevel(player, next);
    else finishPlayer(player);
    return;
  }

  player.requiredIndex += 1;
  const next = player.requiredQueue[player.requiredIndex];
  if (next) startLevel(player, next);
  else {
    player.currentLevelId = undefined;
    player.phase = "bonus-offer";
  }
}

function findPlayer(players: PlayerRecord[], id: string) {
  return players.find((player) => player.id === id);
}

function costPreview(player: PlayerRecord) {
  const def = currentDef(player);
  const attempt = def ? player.attempts[def.id] : undefined;
  if (!def || !attempt) return {};
  return {
    nextWrongCost: nextWrongCost(def, attempt.wrongAttempts),
    hintCost: Math.round(def.basePoints * 0.3),
  };
}

function withRank(player: PlayerRecord, state: GameState): ActionResponse {
  const extra: ActionResponse = { state, ...costPreview(player) };
  if (player.phase === "finished") {
    extra.rank = rankOf(player.id);
  }
  return extra;
}

let cachedRankStamp = 0;
let cachedRanks = new Map<string, { rank: number; finishedTotal: number }>();

function rankOf(playerId: string): number | undefined {
  return cachedRanks.get(playerId)?.rank;
}

export async function refreshRanks(): Promise<void> {
  const snapshot = await readStore((db) => db.players.map((p) => ({ ...p })));
  const finished = snapshot
    .filter((player) => player.phase === "finished")
    .sort(comparePlayers);
  const ranks = new Map<string, { rank: number; finishedTotal: number }>();
  finished.forEach((player, index) => {
    ranks.set(player.id, {
      rank: index + 1,
      finishedTotal: finished.length,
    });
  });
  cachedRanks = ranks;
  cachedRankStamp = Date.now();
  void cachedRankStamp;
}

function comparePlayers(a: PlayerRecord, b: PlayerRecord): number {
  const scoreDiff = playerScore(b) - playerScore(a);
  if (scoreDiff !== 0) return scoreDiff;
  const aDone = a.finishedAt ?? Number.MAX_SAFE_INTEGER;
  const bDone = b.finishedAt ?? Number.MAX_SAFE_INTEGER;
  if (aDone !== bDone) return aDone - bDone;
  return a.createdAt - b.createdAt;
}

function isPerfect(player: PlayerRecord): boolean {
  return player.requiredQueue.every((id) => {
    const attempt = player.attempts[id];
    return attempt?.solved && !attempt.revealed && attempt.wrongAttempts === 0;
  });
}

export async function registerPlayer(input: {
  name: string;
  school: string;
  grade: string;
}): Promise<
  | { player: PlayerRecord; state: GameState; nextWrongCost?: number; hintCost?: number }
  | { error: string; status: number }
> {
  const name = normalizeName(input.name);
  const school = normalizeName(input.school, 80);
  const grade = normalizeName(input.grade, 12).toLowerCase();

  if (name.length < 2) return { error: "Укажите имя", status: 400 };
  if (school.length < 2) return { error: "Укажите школу", status: 400 };
  if (!grade) return { error: "Укажите класс", status: 400 };

  return withStore((db) => {
    if (!db.settings.registrationOpen) {
      return { error: "Регистрация сейчас закрыта", status: 403 } as const;
    }

    const id = makeId("p");
    const player: PlayerRecord = {
      id,
      name,
      school,
      grade,
      seed: id,
      createdAt: Date.now(),
      phase: "level",
      requiredQueue: [...REQUIRED_LEVEL_IDS],
      bonusQueue: [...BONUS_LEVEL_IDS],
      requiredIndex: 0,
      bonusIndex: 0,
      attempts: {},
      earnedSkills: [],
    };
    startLevel(player, player.requiredQueue[0]);
    db.players.push(player);
    return { player, state: buildState(player), ...costPreview(player) };
  });
}

export async function getPlayerState(
  playerId: string,
): Promise<ActionResponse | { error: string; status: number }> {
  const player = await readStore((db) => findPlayer(db.players, playerId));
  if (!player) return { error: "Сессия не найдена", status: 404 };
  await refreshRanks();
  const ranked = cachedRanks.get(player.id);
  return {
    state: buildState(player, Boolean(player.attempts[player.currentLevelId ?? ""]?.hintUsed)),
    rank: ranked?.rank,
    finishedTotal: ranked?.finishedTotal,
    ...costPreview(player),
  };
}

export async function submitAnswer(
  playerId: string,
  answer: Answer,
): Promise<ActionResponse | { error: string; status: number }> {
  const result = await withStore((db) => {
    const player = findPlayer(db.players, playerId);
    if (!player) return { error: "Сессия не найдена", status: 404 } as const;
    if (player.phase !== "level") {
      return { error: "Сейчас нельзя отправить ответ", status: 409 } as const;
    }
    const def = currentDef(player);
    const attempt = def ? player.attempts[def.id] : undefined;
    if (!def || !attempt) {
      return { error: "Уровень не найден", status: 409 } as const;
    }
    if (attempt.solved || attempt.revealed) {
      return { state: buildState(player), correct: true, points: attempt.points };
    }

    const correct = checkAnswer(def, answer);
    if (!correct) {
      attempt.wrongAttempts += 1;
      return {
        state: buildState(player, attempt.hintUsed),
        correct: false,
        points: 0,
        ...costPreview(player),
      };
    }

    attempt.solved = true;
    attempt.points = scoreLevel(def, {
      elapsedMs: Date.now() - attempt.startedAt,
      wrongAttempts: attempt.wrongAttempts,
      hintUsed: attempt.hintUsed,
      revealed: false,
    });
    for (const skill of def.skills) player.earnedSkills.push(skill);
    const explanation = def.explanation;
    const points = attempt.points;
    const nextHook = def.nextHook;
    advance(player);
    return {
      state: buildState(player),
      correct: true,
      points,
      explanation,
      nextHook,
      ...costPreview(player),
    };
  });

  if ("error" in result) return result;
  if (result.state.phase === "finished") await refreshRanks();
  const ranked = cachedRanks.get(playerId);
  return {
    ...result,
    rank: ranked?.rank,
    finishedTotal: ranked?.finishedTotal,
  };
}

export async function takeHint(
  playerId: string,
): Promise<ActionResponse | { error: string; status: number }> {
  return withStore((db) => {
    const player = findPlayer(db.players, playerId);
    if (!player) return { error: "Сессия не найдена", status: 404 } as const;
    const def = currentDef(player);
    const attempt = def ? player.attempts[def.id] : undefined;
    if (!def || !attempt || player.phase !== "level") {
      return { error: "Подсказка недоступна", status: 409 } as const;
    }
    attempt.hintUsed = true;
    return {
      state: buildState(player, true),
      hint: def.hint,
      ...costPreview(player),
    };
  });
}

export async function revealLevel(
  playerId: string,
): Promise<ActionResponse | { error: string; status: number }> {
  const result = await withStore((db) => {
    const player = findPlayer(db.players, playerId);
    if (!player) return { error: "Сессия не найдена", status: 404 } as const;
    const def = currentDef(player);
    const attempt = def ? player.attempts[def.id] : undefined;
    if (!def || !attempt || player.phase !== "level") {
      return { error: "Разбор недоступен", status: 409 } as const;
    }
    if (attempt.wrongAttempts < REVEAL_AFTER_WRONG) {
      return { error: "Сначала попробуйте ещё раз", status: 409 } as const;
    }
    attempt.revealed = true;
    attempt.points = 0;
    const explanation = `${def.explanation}\n\nКак должно быть:\n${solutionLines(def).join("\n")}`;
    const nextHook = def.nextHook;
    advance(player);
    return {
      state: buildState(player),
      correct: false,
      points: 0,
      explanation,
      nextHook,
    };
  });
  if ("error" in result) return result;
  if (result.state.phase === "finished") await refreshRanks();
  return result;
}

export async function startBonus(
  playerId: string,
): Promise<ActionResponse | { error: string; status: number }> {
  return withStore((db) => {
    const player = findPlayer(db.players, playerId);
    if (!player) return { error: "Сессия не найдена", status: 404 } as const;
    if (player.phase !== "bonus-offer") {
      return { error: "Бонусные уровни сейчас недоступны", status: 409 } as const;
    }
    player.bonusIndex = 0;
    startLevel(player, player.bonusQueue[0]);
    return { state: buildState(player), ...costPreview(player) };
  });
}

export async function skipBonus(
  playerId: string,
): Promise<ActionResponse | { error: string; status: number }> {
  const result = await withStore((db) => {
    const player = findPlayer(db.players, playerId);
    if (!player) return { error: "Сессия не найдена", status: 404 } as const;
    if (player.phase !== "bonus-offer" && player.phase !== "level") {
      return { error: "Нельзя завершить игру сейчас", status: 409 } as const;
    }
    if (player.phase === "level" && !isBonusLevel(player.currentLevelId ?? "")) {
      return { error: "Сначала закройте основные модули", status: 409 } as const;
    }
    finishPlayer(player);
    return withRank(player, buildState(player));
  });
  if ("error" in result) return result;
  await refreshRanks();
  const ranked = cachedRanks.get(playerId);
  return {
    ...result,
    rank: ranked?.rank,
    finishedTotal: ranked?.finishedTotal,
  };
}

export async function getLeaderboard(): Promise<LeaderboardResponse> {
  return readStore((db) => {
    const now = Date.now();
    const sorted = [...db.players].sort(comparePlayers);
    const finished = sorted.filter((player) => player.phase === "finished");
    const playing = db.players.filter((player) => player.phase !== "finished");
    const scores = db.players.map(playerScore);
    const stats: LiveStats = {
      playingNow: playing.length,
      finishedTotal: finished.length,
      bestScore: scores.length ? Math.max(...scores) : 0,
      averageScore: scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0,
    };

    const top: LeaderboardEntry[] = sorted.slice(0, 40).map((player, index) => ({
      rank: index + 1,
      playerId: player.id,
      name: player.name,
      school: player.school,
      grade: player.grade,
      score: playerScore(player),
      totalTimeSec: elapsedSec(player, now),
      solvedRequired: player.requiredQueue.filter(
        (id) => player.attempts[id]?.solved,
      ).length,
      solvedBonus: player.bonusQueue.filter((id) => player.attempts[id]?.solved)
        .length,
      perfect: isPerfect(player) && player.phase === "finished",
    }));

    const active: ActivePlayer[] = playing
      .sort((a, b) => playerScore(b) - playerScore(a))
      .slice(0, 12)
      .map((player) => ({
        playerId: player.id,
        name: player.name,
        school: player.school,
        score: playerScore(player),
        position:
          player.phase === "bonus-offer"
            ? player.requiredQueue.length
            : player.requiredIndex + (isBonusLevel(player.currentLevelId ?? "") ? 1 : 1),
        totalRequired: player.requiredQueue.length,
      }));

    return { top, active, stats, updatedAt: now };
  });
}

export async function resetAll(): Promise<void> {
  await withStore((db) => {
    db.players = [];
  });
  cachedRanks = new Map();
}

export async function setRegistrationOpen(open: boolean): Promise<boolean> {
  return withStore((db) => {
    db.settings.registrationOpen = open;
    return open;
  });
}

export async function getSettings() {
  return readStore((db) => db.settings);
}

export async function exportRows() {
  return readStore((db) =>
    db.players.map((player) => ({
      name: player.name,
      school: player.school,
      grade: player.grade,
      score: playerScore(player),
      timeSec: elapsedSec(player),
      status: player.phase === "finished" ? "финиш" : "в игре",
      solvedRequired: player.requiredQueue.filter(
        (id) => player.attempts[id]?.solved,
      ).length,
      solvedBonus: player.bonusQueue.filter((id) => player.attempts[id]?.solved)
        .length,
    })),
  );
}
