"use client";

import { useEffect, useMemo, useState } from "react";
import { BI_CARD, BRIEFING, GAME, GRADE_OPTIONS, HOW_TO, LANDING, SKILL_LABELS } from "@/lib/copy";
import {
  api,
  clearStoredPlayerId,
  getStoredPlayerId,
  markBriefingSeen,
  sendAction,
  setStoredPlayerId,
  wasBriefingSeen,
} from "@/lib/client";
import { formatTime } from "@/lib/format";
import type { ActionResponse, Answer, GameState } from "@/lib/types";
import { Puzzle } from "./Puzzle";

type JoinPayload = {
  playerId: string;
  state: GameState;
  hintCost?: number;
  nextWrongCost?: number;
};

export function PlayerApp() {
  const [state, setState] = useState<GameState | null>(null);
  const [rank, setRank] = useState<number | undefined>();
  const [finishedTotal, setFinishedTotal] = useState<number | undefined>();
  const [hintCost, setHintCost] = useState<number>();
  const [nextWrongCost, setNextWrongCost] = useState<number>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<{
    title: string;
    text: string;
    points?: number;
    nextHook?: string;
  } | null>(null);
  const [shake, setShake] = useState(0);
  const [briefing, setBriefing] = useState(false);

  function apply(response: ActionResponse, celebration?: { title: string; text: string; points?: number; nextHook?: string }) {
    setState(response.state);
    setRank(response.rank);
    setFinishedTotal(response.finishedTotal);
    setHintCost(response.hintCost);
    setNextWrongCost(response.nextWrongCost);
    if (celebration) setFlash(celebration);
  }

  useEffect(() => {
    const id = getStoredPlayerId();
    if (!id) {
      setLoading(false);
      return;
    }
    api<ActionResponse>("/api/session")
      .then((response) => {
        apply(response);
        const id = getStoredPlayerId();
        if (id && !wasBriefingSeen(id)) setBriefing(true);
      })
      .catch(() => {
        clearStoredPlayerId();
      })
      .finally(() => setLoading(false));
  }, []);

  async function join(form: { name: string; school: string; grade: string }) {
    setError(null);
    try {
      const result = await api<JoinPayload>("/api/session", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setStoredPlayerId(result.playerId);
      apply({
        state: result.state,
        hintCost: result.hintCost,
        nextWrongCost: result.nextWrongCost,
      });
      setBriefing(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось начать смену");
    }
  }

  async function act(body: Record<string, unknown>) {
    setError(null);
    try {
      const response = await sendAction(body);
      if (body.action === "answer" && response.correct === false) {
        setShake((value) => value + 1);
        apply(response);
        setError("Не сходится. Попробуйте ещё раз.");
        return;
      }
      if (response.correct && response.explanation) {
        apply(response, {
          title: "Модуль восстановлен",
          text: response.explanation,
          points: response.points,
          nextHook: response.nextHook,
        });
        return;
      }
      if (body.action === "reveal" && response.explanation) {
        apply(response, {
          title: "Разбор без баллов",
          text: response.explanation,
          points: 0,
          nextHook: response.nextHook,
        });
        return;
      }
      apply(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  }

  function restart() {
    clearStoredPlayerId();
    setState(null);
    setRank(undefined);
    setFinishedTotal(undefined);
    setFlash(null);
    setBriefing(false);
    setError(null);
  }

  if (loading) {
    return (
      <Shell>
        <p className="text-muted">Подключаемся к студии…</p>
      </Shell>
    );
  }

  if (!state) {
    return <JoinForm error={error} onJoin={join} />;
  }

  if (briefing) {
    return (
      <BriefingScreen
        name={state.progress.name}
        onContinue={() => {
          const id = getStoredPlayerId();
          if (id) markBriefingSeen(id);
          setBriefing(false);
        }}
      />
    );
  }

  if (flash) {
    return (
      <Shell>
        <div className="space-y-5">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan">PIXEL OVEN</p>
          <h1 className="text-3xl font-semibold">{flash.title}</h1>
          {typeof flash.points === "number" && (
            <p className="font-mono text-cyan">+{flash.points} очков</p>
          )}
          <p className="whitespace-pre-line text-pretty text-muted">{flash.text}</p>
          {flash.nextHook && (
            <p className="rounded-2xl border border-cyan/30 bg-cyan/10 px-4 py-3 text-sm text-cyan">
              Дальше по смене: {flash.nextHook}
            </p>
          )}
          <button
            type="button"
            onClick={() => setFlash(null)}
            className="w-full rounded-2xl bg-cyan px-4 py-3 font-semibold text-black"
          >
            Дальше
          </button>
        </div>
      </Shell>
    );
  }

  if (state.phase === "bonus-offer") {
    return (
      <Shell>
        <div className="space-y-5">
          <p className="text-xs uppercase tracking-[0.2em] text-green">релиз спасён</p>
          <h1 className="text-3xl font-semibold">Основная смена закрыта</h1>
          <p className="text-muted">
            «{GAME.product}» снова собирается: запуск, корзина, заказ, цифры, скидка, закон, требования и
            курьеры на месте. Можно закрыть смену с {state.progress.score} очками — или остаться на
            сверхурочные. Маркетолог уже прислал рассылку, инвестор ждёт в переговорке, а оплата ломается,
            если банк ответил отказом.
          </p>
          <button
            type="button"
            onClick={() => void act({ action: "start-bonus" })}
            className="w-full rounded-2xl bg-cyan px-4 py-3 font-semibold text-black"
          >
            Взять сверхурочные
          </button>
          <button
            type="button"
            onClick={() => void act({ action: "skip-bonus" })}
            className="w-full rounded-2xl border border-line px-4 py-3 text-muted"
          >
            Завершить смену
          </button>
          <button
            type="button"
            onClick={() => setBriefing(true)}
            className="w-full text-sm text-cyan"
          >
            Ещё раз прочитать сюжет
          </button>
        </div>
      </Shell>
    );
  }

  if (state.phase === "finished") {
    return (
      <ResultScreen
        state={state}
        rank={rank}
        finishedTotal={finishedTotal}
        onReplay={restart}
        onBriefing={() => setBriefing(true)}
      />
    );
  }

  if (!state.view) {
    return (
      <Shell>
        <p className="text-muted">Ждём следующий модуль…</p>
      </Shell>
    );
  }

  return (
    <GameScreen
      state={state}
      error={error}
      shake={shake}
      hintCost={hintCost}
      nextWrongCost={nextWrongCost}
      onAnswer={(answer) => void act({ action: "answer", answer })}
      onHint={() => void act({ action: "hint" })}
      onReveal={() => void act({ action: "reveal" })}
      onBriefing={() => setBriefing(true)}
      onRestart={restart}
    />
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-4 py-6 sm:py-10">{children}</main>
  );
}

function JoinForm({
  error,
  onJoin,
}: {
  error: string | null;
  onJoin: (form: { name: string; school: string; grade: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("11");
  const [busy, setBusy] = useState(false);

  return (
    <Shell>
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan">{LANDING.kicker}</p>
          <h1 className="text-4xl font-semibold tracking-tight">{LANDING.headline}</h1>
          <p className="text-pretty text-muted">{LANDING.pitch}</p>
          <p className="text-pretty text-muted">{LANDING.incident}</p>
          <p className="text-pretty font-medium text-foreground">{LANDING.role}</p>
        </div>
        <section className="space-y-2 rounded-3xl border border-cyan/20 bg-cyan/5 p-4 text-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan">Экраны мероприятия</p>
          <p>
            <span className="font-medium text-foreground">Игра (телефон школьника).</span> Этот
            адрес: имя, брифинг, задания, таблица в конце.
          </p>
          <p>
            <span className="font-medium text-foreground">Проектор.</span>{" "}
            <a href="/host" className="text-cyan underline">
              /host
            </a>{" "}
            — QR-код и живая таблица лидеров. Открой на ноутбуке, выведи на большой экран.
          </p>
          <p>
            <span className="font-medium text-foreground">Ведущий.</span>{" "}
            <a href="/admin" className="text-cyan underline">
              /admin
            </a>{" "}
            — закрыть запись, сбросить результаты, скачать CSV. Пароль по умолчанию{" "}
            пароль из файла <span className="font-mono">.env</span>.
          </p>
        </section>
        <form
          className="space-y-3 rounded-3xl border border-line bg-elev/80 p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            await onJoin({ name, school, grade });
            setBusy(false);
          }}
        >
          <label className="block space-y-1 text-sm">
            <span className="text-muted">Имя</span>
            <input
              required
              minLength={2}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-xl border border-line bg-black/30 px-3 py-3 outline-none ring-cyan focus:ring-2"
              placeholder="Аня"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted">Школа</span>
            <input
              required
              minLength={2}
              value={school}
              onChange={(event) => setSchool(event.target.value)}
              className="w-full rounded-xl border border-line bg-black/30 px-3 py-3 outline-none ring-cyan focus:ring-2"
              placeholder="Лицей 1535"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted">Класс</span>
            <select
              value={grade}
              onChange={(event) => setGrade(event.target.value)}
              className="w-full rounded-xl border border-line bg-black/30 px-3 py-3 outline-none"
            >
              {GRADE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "другое" ? "Другое" : `${option} класс`}
                </option>
              ))}
            </select>
          </label>
          {error && <p className="text-sm text-red">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-cyan px-4 py-3 font-semibold text-black disabled:opacity-60"
          >
            {busy ? "Открываем смену…" : "Заступить на смену"}
          </button>
        </form>
        <p className="text-xs text-muted">
          После имени откроется брифинг на три экрана — кто заказчик, что сломали и как чинить. Затем 8
          модулей по пути заказа и 3 сверхурочных.
        </p>
      </div>
    </Shell>
  );
}

function BriefingScreen({
  name,
  onContinue,
}: {
  name: string;
  onContinue: () => void;
}) {
  const [slide, setSlide] = useState(0);
  const current = BRIEFING.slides[slide];
  const last = slide === BRIEFING.slides.length - 1;

  return (
    <Shell>
      <div className="space-y-5">
        <p className="text-xs uppercase tracking-[0.25em] text-cyan">{BRIEFING.kicker}</p>
        <p className="text-sm text-muted">
          {name}, коротко по делу — без этого смена выглядит как набор задачек.
        </p>
        <p className="text-[11px] uppercase tracking-[0.2em] text-magenta">{current.label}</p>
        <h1 className="text-3xl font-semibold">{current.title}</h1>
        <p className="text-pretty text-muted">{current.body}</p>
        <ul className="space-y-2 text-sm">
          {current.points.map((point) => (
            <li key={point} className="rounded-2xl border border-line bg-elev px-4 py-3">
              {point}
            </li>
          ))}
        </ul>
        <div className="flex gap-1">
          {BRIEFING.slides.map((item, index) => (
            <span
              key={item.label}
              className={`h-1.5 flex-1 rounded-full ${index <= slide ? "bg-cyan" : "bg-line"}`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          {slide > 0 && (
            <button
              type="button"
              onClick={() => setSlide((value) => value - 1)}
              className="rounded-2xl border border-line px-4 py-3 text-muted"
            >
              Назад
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (last) onContinue();
              else setSlide((value) => value + 1);
            }}
            className="flex-1 rounded-2xl bg-cyan px-4 py-3 font-semibold text-black"
          >
            {last ? BRIEFING.cta : "Дальше"}
          </button>
        </div>
        <button type="button" onClick={onContinue} className="w-full text-sm text-muted">
          Пропустить, я уже знаю сюжет
        </button>
      </div>
    </Shell>
  );
}

function GameScreen({
  state,
  error,
  shake,
  hintCost,
  nextWrongCost,
  onAnswer,
  onHint,
  onReveal,
  onBriefing,
  onRestart,
}: {
  state: GameState;
  error: string | null;
  shake: number;
  hintCost?: number;
  nextWrongCost?: number;
  onAnswer: (answer: Answer) => void;
  onHint: () => void;
  onReveal: () => void;
  onBriefing: () => void;
  onRestart: () => void;
}) {
  const view = state.view!;
  const level = view.level;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);

  const remaining = Math.ceil(level.timeLimitSec - (now - view.startedAt) / 1000);
  const overtime = remaining < 0;
  const total = state.progress.totalRequired;

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between gap-3 text-xs text-muted">
        <span className="font-mono text-cyan">{GAME.studio}</span>
        <span className="flex items-center gap-3">
          <span>
            {state.progress.name} · {state.progress.score} оч.
          </span>
          <button type="button" onClick={onBriefing} className="text-cyan">
            Сюжет
          </button>
          <button type="button" onClick={onRestart} className="text-muted">
            Заново
          </button>
        </span>
      </div>
      <div className="mb-4 flex gap-1">
        {Array.from({ length: total }).map((_, index) => {
          const completed = level.isBonus ? total : level.position - 1;
          const filled = index < completed;
          const solved = index < state.progress.solvedRequired;
          return (
            <span
              key={index}
              className={`h-1.5 flex-1 rounded-full ${
                solved ? "bg-cyan" : filled ? "bg-amber" : index === completed ? "bg-magenta" : "bg-line"
              }`}
            />
          );
        })}
      </div>
      <div key={shake} className={`space-y-4 ${shake ? "shake" : ""}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-magenta">
              {level.isBonus ? "сверхурочные" : `модуль ${level.position} / ${total}`} ·{" "}
              {level.chapter}
            </p>
            <h1 className="mt-1 text-2xl font-semibold">{level.title}</h1>
          </div>
          <div
            className={`rounded-xl border px-3 py-2 font-mono text-lg ${
              overtime ? "border-red text-red" : remaining <= 15 ? "border-amber text-amber" : "border-line"
            }`}
          >
            {overtime ? "+" : ""}
            {formatTime(Math.abs(remaining))}
          </div>
        </div>
        <p className="text-pretty text-sm text-muted">{level.story}</p>
        <p className="rounded-2xl border border-cyan/20 bg-cyan/5 px-3 py-2 text-sm text-cyan">
          Как действовать: {HOW_TO[level.kind]}
        </p>
        <p className="text-sm font-medium">{level.task}</p>
        <div className="editor-glow rounded-2xl bg-elev/90 p-3">
          <div className="mb-3 flex items-center justify-between font-mono text-[11px] text-muted">
            <span>{level.fileName}</span>
            <span>повреждён</span>
          </div>
          <Puzzle level={level} onSubmit={onAnswer} />
        </div>
        {view.hint && (
          <p className="rounded-2xl border border-amber/30 bg-amber/10 px-3 py-2 text-sm text-amber">
            Подсказка: {view.hint}
          </p>
        )}
        {error && <p className="text-sm text-red">{error}</p>}
        <div className="flex flex-wrap gap-2 text-sm">
          {level.hintAvailable && !view.hintUsed && (
            <button
              type="button"
              onClick={onHint}
              className="rounded-xl border border-line px-3 py-2 text-muted"
            >
              Подсказка{hintCost ? ` (−${hintCost})` : ""}
            </button>
          )}
          {view.canReveal && (
            <button
              type="button"
              onClick={onReveal}
              className="rounded-xl border border-red/40 px-3 py-2 text-red"
            >
              Сдаться без очков
            </button>
          )}
        </div>
      <p className="text-xs text-muted">
        Неверный ответ снимает очки
        {typeof nextWrongCost === "number" ? ` (ещё −${nextWrongCost})` : ""}.
        После двух ошибок можно посмотреть разбор.
      </p>
      </div>
    </Shell>
  );
}

function ResultScreen({
  state,
  rank,
  finishedTotal,
  onReplay,
  onBriefing,
}: {
  state: GameState;
  rank?: number;
  finishedTotal?: number;
  onReplay: () => void;
  onBriefing: () => void;
}) {
  const skills = state.progress.skills;
  const place = useMemo(() => {
    if (!rank) return "Смена закрыта";
    if (finishedTotal) return `${rank} место из ${finishedTotal}`;
    return `${rank} место`;
  }, [rank, finishedTotal]);

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-green">релиз состоялся</p>
          <h1 className="mt-2 text-3xl font-semibold">{state.progress.name}, вы спасли ночь</h1>
          <p className="mt-2 font-mono text-cyan">
            {state.progress.score} очков · {formatTime(state.progress.elapsedSec)} · {place}
          </p>
        </div>
        <div className="rounded-3xl border border-line bg-elev p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">закрытые модули</p>
          <p className="mt-2 text-sm">
            Основные {state.progress.solvedRequired}/{state.progress.totalRequired}
            {state.progress.solvedBonus > 0
              ? ` · сверхурочные ${state.progress.solvedBonus}/${state.progress.totalBonus}`
              : ""}
          </p>
        </div>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{BI_CARD.title}</h2>
          <p className="text-pretty text-muted">{BI_CARD.lead}</p>
          <ul className="space-y-2 text-sm">
            {BI_CARD.points.map((point) => (
              <li key={point} className="rounded-xl border border-line bg-soft px-3 py-2">
                {point}
              </li>
            ))}
          </ul>
        </section>
        {skills.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Навыки этой смены</h2>
            <div className="space-y-2">
              {skills.map((skill) => (
                <article key={skill} className="rounded-2xl border border-cyan/20 bg-cyan/5 p-3">
                  <h3 className="font-medium text-cyan">{SKILL_LABELS[skill].title}</h3>
                  <p className="mt-1 text-sm text-muted">{SKILL_LABELS[skill].detail}</p>
                </article>
              ))}
            </div>
          </section>
        )}
        <p className="text-pretty text-sm text-muted">{BI_CARD.specialty}</p>
        <button
          type="button"
          onClick={onBriefing}
          className="w-full rounded-2xl border border-line px-4 py-3 text-muted"
        >
          Ещё раз прочитать сюжет
        </button>
        <button
          type="button"
          onClick={onReplay}
          className="w-full rounded-2xl border border-line px-4 py-3 text-muted"
        >
          Освободить устройство для следующего игрока
        </button>
      </div>
    </Shell>
  );
}
