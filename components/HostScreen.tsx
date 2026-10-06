"use client";

import { useEffect, useState } from "react";
import { HOST_PITCH } from "@/lib/copy";
import { formatTime } from "@/lib/format";
import type { LeaderboardEntry, LiveStats } from "@/lib/types";

interface HostPayload {
  title: string;
  studio: string;
  product: string;
  url: string;
  candidates: string[];
  qr: string;
  registrationOpen: boolean;
  top: LeaderboardEntry[];
  stats: LiveStats;
  updatedAt: number;
}

export function HostScreen() {
  const [data, setData] = useState<HostPayload | null>(null);
  const [url, setUrl] = useState<string>();
  const [error, setError] = useState<string | null>(null);

  async function load(nextUrl?: string) {
    const query =
      nextUrl && nextUrl.startsWith("http")
        ? `?url=${encodeURIComponent(nextUrl)}`
        : "";
    const response = await fetch(`/api/host${query}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Не удалось загрузить экран ведущего");
    const payload = (await response.json()) as HostPayload;
    setData(payload);
    setUrl(payload.url);
  }

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      load(url).catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    };
    tick();
    const timer = setInterval(tick, 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [url]);

  if (error && !data) {
    return <p className="p-8 text-red">{error}</p>;
  }
  if (!data) {
    return <p className="p-8 text-muted">Собираем экран релиза…</p>;
  }

  return (
    <main className="grid min-h-dvh grid-cols-1 gap-6 p-6 lg:grid-cols-[minmax(320px,420px)_1fr]">
      <section className="flex flex-col rounded-[28px] border border-cyan/20 bg-elev p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan">{data.studio}</p>
        <h1 className="mt-2 text-4xl font-semibold">{data.title}</h1>
        <p className="mt-3 text-muted">{HOST_PITCH}</p>
        <p className="mt-3 rounded-2xl border border-line bg-black/20 px-3 py-2 text-xs text-muted">
          Этот экран — на проектор. В списке адресов выбери IP вида 192.168… или 172…, не localhost.
          Телефоны должны быть в той же Wi-Fi. Панель ведущего: /admin.
        </p>
        {/* QR is a data URL generated on the server */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={data.qr}
          alt="QR-код для входа в игру"
          className="mx-auto my-6 w-full max-w-xs rounded-3xl"
        />
        <p className="break-all text-center font-mono text-sm text-cyan">{data.url}</p>
        {data.candidates.length > 1 && (
          <label className="mt-4 block text-xs text-muted">
            Адрес для QR
            <select
              value={data.url}
              onChange={(event) => setUrl(event.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-black/30 px-3 py-2 text-sm text-foreground"
            >
              {data.candidates.map((candidate) => (
                <option key={candidate} value={candidate}>
                  {candidate}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="mt-auto grid grid-cols-2 gap-3 pt-6 text-sm">
          <Stat label="сейчас играют" value={String(data.stats.playingNow)} live />
          <Stat label="финишировали" value={String(data.stats.finishedTotal)} />
          <Stat label="лучший счёт" value={String(data.stats.bestScore)} />
          <Stat
            label="запись"
            value={data.registrationOpen ? "открыта" : "закрыта"}
          />
        </div>
      </section>
      <section className="rounded-[28px] border border-line bg-elev/80 p-6">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted">таблица смены</p>
            <h2 className="text-2xl font-semibold">Кто спасает релиз</h2>
          </div>
          <a href="/admin" className="text-sm text-muted hover:text-cyan">
            панель ведущего
          </a>
        </div>
        <div className="overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/30 font-mono text-[11px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Игрок</th>
                <th className="px-3 py-2">Школа</th>
                <th className="px-3 py-2">Очки</th>
                <th className="px-3 py-2">Время</th>
                <th className="px-3 py-2">Прогресс</th>
              </tr>
            </thead>
            <tbody>
              {data.top.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted">
                    Ждём первую смену
                  </td>
                </tr>
              )}
              {data.top.map((row, index) => (
                <tr
                  key={row.playerId}
                  className={index === 0 ? "bg-cyan/10" : "odd:bg-black/10"}
                >
                  <td className="px-3 py-2 font-mono text-cyan">{row.rank}</td>
                  <td className="px-3 py-2 font-medium">
                    {row.name}
                    {row.perfect && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-amber">
                        идеал
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted">
                    {row.school}
                    {row.grade ? ` · ${row.grade}` : ""}
                  </td>
                  <td className="px-3 py-2 font-mono">{row.score}</td>
                  <td className="px-3 py-2 font-mono text-muted">
                    {formatTime(row.totalTimeSec)}
                  </td>
                  <td className="px-3 py-2 text-muted">
                    {row.solvedRequired}/8
                    {row.solvedBonus ? ` +${row.solvedBonus}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  live,
}: {
  label: string;
  value: string;
  live?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-black/20 p-3">
      <p className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted">
        {live && <span className="live-dot h-2 w-2 rounded-full bg-green" />}
        {label}
      </p>
      <p className="mt-1 font-mono text-2xl">{value}</p>
    </div>
  );
}
