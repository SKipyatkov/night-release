import { getLeaderboard } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const board = await getLeaderboard();
  return Response.json(board);
}
