import { cookies } from "next/headers";
import { PLAYER_COOKIE } from "@/lib/config";
import { jsonError, playerCookieOptions, playerIdFrom } from "@/lib/http";
import { getPlayerState, registerPlayer } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const playerId = await playerIdFrom(request);
  if (!playerId) return jsonError("Нужно зарегистрироваться", 401);
  const result = await getPlayerState(playerId);
  if ("error" in result) return jsonError(result.error, result.status);
  return Response.json(result);
}

export async function POST(request: Request) {
  let body: { name?: string; school?: string; grade?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Некорректный запрос", 400);
  }

  const result = await registerPlayer({
    name: body.name ?? "",
    school: body.school ?? "",
    grade: body.grade ?? "",
  });

  if ("error" in result) return jsonError(result.error, result.status);

  const jar = await cookies();
  jar.set(PLAYER_COOKIE, result.player.id, playerCookieOptions);

  return Response.json({
    playerId: result.player.id,
    state: result.state,
    hintCost: result.hintCost,
    nextWrongCost: result.nextWrongCost,
  });
}
