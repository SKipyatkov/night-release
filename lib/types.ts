export type LevelKind = "order" | "fill" | "find" | "choice" | "match";

export type Difficulty = "easy" | "medium" | "hard" | "bonus";

export type Skill =
  | "алгоритмы"
  | "логика"
  | "экономика"
  | "право"
  | "аналитика"
  | "безопасность";

export interface CodeLine {
  id: string;
  text: string;
  indent?: number;
}

export type FillToken =
  | { type: "line"; text: string; indent?: number }
  | { type: "slot"; id: string; indent?: number };

/** Данные уровня, которые безопасно отдавать в браузер: без правильных ответов. */
interface PublicLevelBase {
  id: string;
  kind: LevelKind;
  title: string;
  chapter: string;
  story: string;
  task: string;
  difficulty: Difficulty;
  skills: Skill[];
  basePoints: number;
  timeLimitSec: number;
  /** Номер уровня в очереди игрока, начиная с 1. */
  position: number;
  isBonus: boolean;
  hintAvailable: boolean;
  fileName: string;
}

export interface PublicOrderLevel extends PublicLevelBase {
  kind: "order";
  lines: CodeLine[];
}

export interface PublicFillLevel extends PublicLevelBase {
  kind: "fill";
  template: FillToken[];
  bank: CodeLine[];
}

export interface PublicFindLevel extends PublicLevelBase {
  kind: "find";
  lines: CodeLine[];
  selectCount: number;
}

export interface PublicChoiceLevel extends PublicLevelBase {
  kind: "choice";
  question: string;
  facts: string[];
  options: CodeLine[];
  multiple: boolean;
}

export interface PublicMatchLevel extends PublicLevelBase {
  kind: "match";
  left: CodeLine[];
  right: CodeLine[];
}

export type PublicLevel =
  | PublicOrderLevel
  | PublicFillLevel
  | PublicFindLevel
  | PublicChoiceLevel
  | PublicMatchLevel;

export type Answer =
  | { kind: "order"; order: string[] }
  | { kind: "fill"; slots: Record<string, string> }
  | { kind: "find"; selected: string[] }
  | { kind: "choice"; selected: string[] }
  | { kind: "match"; pairs: Record<string, string> };

export interface LevelProgress {
  levelId: string;
  title: string;
  solved: boolean;
  revealed: boolean;
  points: number;
  isBonus: boolean;
}

export interface PlayerProgress {
  name: string;
  score: number;
  solvedRequired: number;
  totalRequired: number;
  solvedBonus: number;
  totalBonus: number;
  elapsedSec: number;
  levels: LevelProgress[];
  skills: Skill[];
}

export type GamePhase = "level" | "bonus-offer" | "finished";

export interface LevelView {
  level: PublicLevel;
  startedAt: number;
  wrongAttempts: number;
  hintUsed: boolean;
  hint?: string;
  canReveal: boolean;
}

export interface GameState {
  phase: GamePhase;
  view?: LevelView;
  progress: PlayerProgress;
}

export interface AnswerResult {
  correct: boolean;
  points: number;
  explanation?: string;
  wrongAttempts: number;
  canReveal: boolean;
  progress: PlayerProgress;
}

export interface ActionResponse {
  state: GameState;
  correct?: boolean;
  points?: number;
  explanation?: string;
  hint?: string;
  nextWrongCost?: number;
  hintCost?: number;
  nextHook?: string;
  rank?: number;
  finishedTotal?: number;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  name: string;
  school: string;
  grade: string;
  score: number;
  totalTimeSec: number;
  solvedRequired: number;
  solvedBonus: number;
  perfect: boolean;
}

export interface LiveStats {
  playingNow: number;
  finishedTotal: number;
  bestScore: number;
  averageScore: number;
}

export interface ActivePlayer {
  playerId: string;
  name: string;
  school: string;
  score: number;
  position: number;
  totalRequired: number;
}

export interface LeaderboardResponse {
  top: LeaderboardEntry[];
  active: ActivePlayer[];
  stats: LiveStats;
  updatedAt: number;
}
