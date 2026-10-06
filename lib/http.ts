import { cookies } from "next/headers";
import { PLAYER_COOKIE } from "./config";

export async function playerIdFrom(request: Request): Promise<string | null> {
  const header = request.headers.get("x-player-id")?.trim();
  if (header) return header;
  const jar = await cookies();
  return jar.get(PLAYER_COOKIE)?.value ?? null;
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export const playerCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 12,
};
