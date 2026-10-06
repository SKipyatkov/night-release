"use client";

import { useState } from "react";

interface Row {
  name: string;
  school: string;
  grade: string;
  score: number;
  timeSec: number;
  status: string;
  solvedRequired: number;
  solvedBonus: number;
}

interface AdminPayload {
  ok: boolean;
  settings: { registrationOpen: boolean };
  rows: Row[];
}

export function AdminScreen() {
  const [secret, setSecret] = useState("");
  const [data, setData] = useState<AdminPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (body.action === "export" && response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "night-release.csv";
        link.click();
        URL.revokeObjectURL(url);
        setBusy(false);
        return;
      }
      const payload = (await response.json()) as AdminPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Ошибка");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <p className="text-xs uppercase tracking-[0.25em] text-cyan">ведущий</p>
        <h1 className="mt-2 text-3xl font-semibold">Панель смены</h1>
        <form
          className="mt-6 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void send({ action: "login", secret });
          }}
        >
          <input
            type="password"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            placeholder="Пароль из ADMIN_SECRET"
            className="w-full rounded-xl border border-line bg-black/30 px-3 py-3"
          />
          {error && <p className="text-sm text-red">{error}</p>}
          <button className="w-full rounded-2xl bg-cyan py-3 font-semibold text-black">
            Войти
          </button>
        </form>
        <p className="mt-4 text-sm text-muted">
          Пароль задан в файле <span className="font-mono text-cyan">.env</span> на компьютере
          ведущего.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-cyan">ведущий</p>
          <h1 className="text-3xl font-semibold">Управление сменой</h1>
        </div>
        <a href="/host" className="text-sm text-muted hover:text-cyan">
          экран для проектора
        </a>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          disabled={busy}
          onClick={() =>
            void send({
              action: "registration",
              open: !data.settings.registrationOpen,
              secret,
            })
          }
          className="rounded-2xl border border-line px-4 py-3"
        >
          {data.settings.registrationOpen ? "Закрыть запись" : "Открыть запись"}
        </button>
        <button
          disabled={busy}
          onClick={() => void send({ action: "export", secret })}
          className="rounded-2xl border border-line px-4 py-3"
        >
          Скачать CSV
        </button>
        <button
          disabled={busy}
          onClick={() => {
            if (confirm("Сбросить всех игроков? Таблица обнулится.")) {
              void send({ action: "reset", secret });
            }
          }}
          className="rounded-2xl border border-red/40 px-4 py-3 text-red"
        >
          Сбросить результаты
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red">{error}</p>}
      <div className="mt-6 overflow-hidden rounded-2xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/30 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-3 py-2">Имя</th>
              <th className="px-3 py-2">Школа</th>
              <th className="px-3 py-2">Очки</th>
              <th className="px-3 py-2">Статус</th>
              <th className="px-3 py-2">Модули</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={`${row.name}-${row.school}`} className="odd:bg-black/10">
                <td className="px-3 py-2">{row.name}</td>
                <td className="px-3 py-2 text-muted">
                  {row.school} · {row.grade}
                </td>
                <td className="px-3 py-2 font-mono">{row.score}</td>
                <td className="px-3 py-2">{row.status}</td>
                <td className="px-3 py-2 text-muted">
                  {row.solvedRequired}/8
                  {row.solvedBonus ? ` +${row.solvedBonus}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
