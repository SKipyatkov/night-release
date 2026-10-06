export const PLAYER_COOKIE = "rn_player";
export const ADMIN_COOKIE = "rn_admin";
export const REVEAL_AFTER_WRONG = 2;
export const LEADERBOARD_LIMIT = 20;

export function adminSecret(): string {
  return process.env.ADMIN_SECRET?.trim() || "Alex1608";
}
