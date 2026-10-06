import os from "os";
import QRCode from "qrcode";
import { headers } from "next/headers";
import { GAME } from "@/lib/copy";
import { getLeaderboard, getSettings } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function lanOrigins(port: string): string[] {
  const nets = os.networkInterfaces();
  const origins: string[] = [];
  for (const list of Object.values(nets)) {
    for (const net of list ?? []) {
      const v4 = String(net.family) === "IPv4" || String(net.family) === "4";
      if (v4 && !net.internal) {
        origins.push(`http://${net.address}:${port}`);
      }
    }
  }
  return origins;
}

export async function GET(request: Request) {
  const headerList = await headers();
  const hostHeader = headerList.get("host")?.trim() || "localhost:3000";
  const proto = headerList.get("x-forwarded-proto")?.trim() || "http";
  const current = `${proto}://${hostHeader}`;
  const port = hostHeader.includes(":") ? hostHeader.split(":").pop() || "3000" : "3000";
  const requested = new URL(request.url).searchParams.get("url")?.trim() || "";
  const publicUrl = process.env.PUBLIC_URL?.trim().replace(/\/$/, "") || "";

  const candidates = Array.from(
    new Set(
      [publicUrl, current, ...lanOrigins(port)].filter((value) => value.length > 0),
    ),
  );

  const target =
    requested && candidates.includes(requested)
      ? requested
      : candidates[0] || current || "http://localhost:3000";

  const qr = await QRCode.toDataURL(target, {
    width: 640,
    margin: 1,
    color: { dark: "#041016", light: "#7af0ff" },
    errorCorrectionLevel: "M",
  });

  const [board, settings] = await Promise.all([getLeaderboard(), getSettings()]);

  return Response.json({
    title: GAME.title,
    studio: GAME.studio,
    product: GAME.product,
    url: target,
    candidates,
    qr,
    registrationOpen: settings.registrationOpen,
    ...board,
  });
}
