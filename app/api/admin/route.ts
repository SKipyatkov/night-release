import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminSecret } from "@/lib/config";
import { jsonError } from "@/lib/http";
import {
  exportRows,
  getSettings,
  resetAll,
  setRegistrationOpen,
} from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(request: Request, cookieValue?: string): boolean {
  const header = request.headers.get("x-admin-secret")?.trim();
  const secret = adminSecret();
  return header === secret || cookieValue === secret;
}

export async function GET(request: Request) {
  const jar = await cookies();
  if (!authorized(request, jar.get(ADMIN_COOKIE)?.value)) {
    return jsonError("Нужен пароль ведущего", 401);
  }
  const [settings, rows] = await Promise.all([getSettings(), exportRows()]);
  return Response.json({ ok: true, settings, rows });
}

export async function POST(request: Request) {
  let body: { action?: string; secret?: string; open?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Некорректный запрос", 400);
  }

  const jar = await cookies();
  const incoming = body.secret?.trim() || request.headers.get("x-admin-secret")?.trim();
  if (incoming !== adminSecret() && jar.get(ADMIN_COOKIE)?.value !== adminSecret()) {
    return jsonError("Неверный пароль", 401);
  }

  if (incoming === adminSecret()) {
    jar.set(ADMIN_COOKIE, adminSecret(), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
  }

  if (body.action === "login") {
    const [settings, rows] = await Promise.all([getSettings(), exportRows()]);
    return Response.json({ ok: true, settings, rows });
  }

  if (body.action === "reset") {
    await resetAll();
    return Response.json({ ok: true, settings: await getSettings(), rows: [] });
  }

  if (body.action === "registration") {
    const open = await setRegistrationOpen(Boolean(body.open));
    return Response.json({
      ok: true,
      settings: { registrationOpen: open },
      rows: await exportRows(),
    });
  }

  if (body.action === "export") {
    const rows = await exportRows();
    const header = [
      "Имя",
      "Школа",
      "Класс",
      "Очки",
      "Время, сек",
      "Статус",
      "Основные",
      "Бонусы",
    ];
    const lines = [
      header.join(";"),
      ...rows.map((row) =>
        [
          row.name,
          row.school,
          row.grade,
          row.score,
          row.timeSec,
          row.status,
          row.solvedRequired,
          row.solvedBonus,
        ]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(";"),
      ),
    ];
    const csv = `\uFEFF${lines.join("\n")}`;
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="night-release.csv"',
      },
    });
  }

  return jsonError("Неизвестное действие", 400);
}
