import { jsonError, playerIdFrom } from "@/lib/http";
import {
  revealLevel,
  skipBonus,
  startBonus,
  submitAnswer,
  takeHint,
} from "@/lib/session";
import type { Answer } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ActionBody =
  | { action: "answer"; answer: Answer }
  | { action: "hint" }
  | { action: "reveal" }
  | { action: "start-bonus" }
  | { action: "skip-bonus" };

export async function POST(request: Request) {
  const playerId = await playerIdFrom(request);
  if (!playerId) return jsonError("Нужно зарегистрироваться", 401);

  let body: ActionBody;
  try {
    body = (await request.json()) as ActionBody;
  } catch {
    return jsonError("Некорректный запрос", 400);
  }

  const result =
    body.action === "answer"
      ? await submitAnswer(playerId, body.answer)
      : body.action === "hint"
        ? await takeHint(playerId)
        : body.action === "reveal"
          ? await revealLevel(playerId)
          : body.action === "start-bonus"
            ? await startBonus(playerId)
            : body.action === "skip-bonus"
              ? await skipBonus(playerId)
              : { error: "Неизвестное действие", status: 400 };

  if ("error" in result) return jsonError(result.error, result.status);
  return Response.json(result);
}
