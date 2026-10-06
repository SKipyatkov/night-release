import type { LevelDef } from "./levels";

const WRONG_ATTEMPT_PENALTY = 0.2;
const HINT_PENALTY = 0.3;
const MIN_SHARE_WHEN_SOLVED = 0.25;
const SPEED_BONUS_SHARE = 0.5;

export interface ScoreInput {
  elapsedMs: number;
  wrongAttempts: number;
  hintUsed: boolean;
  revealed: boolean;
}

/**
 * Очки считаются только на сервере: базовые баллы уменьшаются за ошибки и
 * подсказку, а сверху добавляется бонус за скорость. Если игрок посмотрел
 * разбор, уровень засчитывается без баллов.
 */
export function scoreLevel(def: LevelDef, input: ScoreInput): number {
  if (input.revealed) return 0;

  const penaltyShare = Math.max(
    MIN_SHARE_WHEN_SOLVED,
    1 -
      WRONG_ATTEMPT_PENALTY * input.wrongAttempts -
      (input.hintUsed ? HINT_PENALTY : 0),
  );

  const limitMs = def.timeLimitSec * 1000;
  const remainingShare = Math.min(
    1,
    Math.max(0, (limitMs - input.elapsedMs) / limitMs),
  );

  const base = def.basePoints * penaltyShare;
  const speedBonus = def.basePoints * SPEED_BONUS_SHARE * remainingShare;

  return Math.round(base + speedBonus);
}

/** Сколько баллов сгорит, если ответить неверно ещё один раз. */
export function nextWrongCost(def: LevelDef, wrongAttempts: number): number {
  const current = Math.max(
    MIN_SHARE_WHEN_SOLVED,
    1 - WRONG_ATTEMPT_PENALTY * wrongAttempts,
  );
  const next = Math.max(
    MIN_SHARE_WHEN_SOLVED,
    1 - WRONG_ATTEMPT_PENALTY * (wrongAttempts + 1),
  );
  return Math.round(def.basePoints * (current - next));
}
