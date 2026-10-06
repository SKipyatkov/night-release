import type { ActionResponse } from "./types";

export const PLAYER_STORAGE = "rn_player_id";

export function getStoredPlayerId(): string | null {
  try {
    return localStorage.getItem(PLAYER_STORAGE);
  } catch {
    return null;
  }
}

export function setStoredPlayerId(id: string) {
  try {
    localStorage.setItem(PLAYER_STORAGE, id);
  } catch {
    /* private mode */
  }
}

export function clearStoredPlayerId() {
  try {
    localStorage.removeItem(PLAYER_STORAGE);
  } catch {
    /* private mode */
  }
}

export const BRIEFING_STORAGE = "rn_briefing_v2";

export function wasBriefingSeen(playerId: string): boolean {
  try {
    return localStorage.getItem(`${BRIEFING_STORAGE}:${playerId}`) === "1";
  } catch {
    return false;
  }
}

export function markBriefingSeen(playerId: string) {
  try {
    localStorage.setItem(`${BRIEFING_STORAGE}:${playerId}`, "1");
  } catch {
    /* private mode */
  }
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const playerId = getStoredPlayerId();
  if (playerId) headers.set("x-player-id", playerId);

  const response = await fetch(path, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new ApiError(data?.error ?? "Не получилось связаться с сервером", response.status);
  }

  return response.json() as Promise<T>;
}

export async function sendAction(
  body: Record<string, unknown>,
): Promise<ActionResponse> {
  return api<ActionResponse>("/api/session/action", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
