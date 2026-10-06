"use client";

import { useState } from "react";
import type {
  Answer,
  CodeLine,
  PublicChoiceLevel,
  PublicFillLevel,
  PublicFindLevel,
  PublicLevel,
  PublicMatchLevel,
  PublicOrderLevel,
} from "@/lib/types";

function indentPad(indent?: number) {
  return { paddingLeft: `${(indent ?? 0) * 16 + 12}px` };
}

function LineText({ line }: { line: Pick<CodeLine, "text" | "indent"> }) {
  return (
    <span className="font-mono text-[13px] leading-5 sm:text-sm" style={indentPad(line.indent)}>
      {line.text}
    </span>
  );
}

function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-left font-mono text-[13px] transition ${
        active
          ? "border-cyan bg-cyan/15 text-cyan"
          : "border-line bg-soft text-foreground hover:border-cyan/50"
      }`}
    >
      {children}
    </button>
  );
}

function OrderPuzzle({
  level,
  onSubmit,
}: {
  level: PublicOrderLevel;
  onSubmit: (answer: Answer) => void;
}) {
  const [lines, setLines] = useState(level.lines);
  const [selected, setSelected] = useState<string | null>(null);
  const [dragY, setDragY] = useState<number | null>(null);

  function move(id: string, dir: -1 | 1) {
    setLines((current) => {
      const index = current.findIndex((line) => line.id === id);
      const nextIndex = index + dir;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const copy = [...current];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, item);
      return copy;
    });
  }

  function tap(id: string) {
    if (!selected) {
      setSelected(id);
      return;
    }
    if (selected === id) {
      setSelected(null);
      return;
    }
    setLines((current) => {
      const a = current.findIndex((line) => line.id === selected);
      const b = current.findIndex((line) => line.id === id);
      if (a < 0 || b < 0) return current;
      const copy = [...current];
      [copy[a], copy[b]] = [copy[b], copy[a]];
      return copy;
    });
    setSelected(null);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Перетащите строки, нажмите стрелки или коснитесь двух строк, чтобы поменять их местами.
      </p>
      <ol className="space-y-2">
        {lines.map((line, index) => (
          <li
            key={line.id}
            onPointerDown={(event) => {
              (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
              setDragY(event.clientY);
            }}
            onPointerMove={(event) => {
              if (dragY === null) return;
              const delta = event.clientY - dragY;
              if (Math.abs(delta) > 36) {
                move(line.id, delta > 0 ? 1 : -1);
                setDragY(event.clientY);
              }
            }}
            onPointerUp={() => setDragY(null)}
            className={`flex items-stretch overflow-hidden rounded-xl border ${
              selected === line.id ? "border-cyan bg-cyan/10" : "border-line bg-soft"
            }`}
          >
            <span className="flex w-8 items-center justify-center bg-black/20 font-mono text-xs text-muted">
              {index + 1}
            </span>
            <button
              type="button"
              onClick={() => tap(line.id)}
              className="flex min-h-12 flex-1 items-center text-left"
            >
              <LineText line={line} />
            </button>
            <div className="flex flex-col border-l border-line">
              <button
                type="button"
                aria-label="Выше"
                onClick={() => move(line.id, -1)}
                className="px-3 py-1 text-muted hover:text-cyan"
              >
                ▲
              </button>
              <button
                type="button"
                aria-label="Ниже"
                onClick={() => move(line.id, 1)}
                className="px-3 py-1 text-muted hover:text-cyan"
              >
                ▼
              </button>
            </div>
          </li>
        ))}
      </ol>
      <CheckButton onClick={() => onSubmit({ kind: "order", order: lines.map((line) => line.id) })}>
        Проверить порядок
      </CheckButton>
    </div>
  );
}

function FillPuzzle({
  level,
  onSubmit,
}: {
  level: PublicFillLevel;
  onSubmit: (answer: Answer) => void;
}) {
  const [slots, setSlots] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<string | null>(null);

  const used = new Set(Object.values(slots));

  function place(slotId: string) {
    if (!picked) {
      if (slots[slotId]) {
        setSlots((current) => {
          const next = { ...current };
          delete next[slotId];
          return next;
        });
      }
      return;
    }
    setSlots((current) => ({ ...current, [slotId]: picked }));
    setPicked(null);
  }

  const slotIds = level.template.filter((token) => token.type === "slot").map((token) => token.id);
  const complete = slotIds.every((id) => slots[id]);

  return (
    <div className="space-y-4">
      <div className="editor-glow space-y-1 rounded-2xl bg-black/30 p-3">
        {level.template.map((token, index) => {
          if (token.type === "line") {
            return (
              <div key={`line-${index}`} className="min-h-9 py-1 text-green/90">
                <LineText line={{ text: token.text, indent: token.indent }} />
              </div>
            );
          }
          const filled = level.bank.find((item) => item.id === slots[token.id]);
          return (
            <button
              key={token.id}
              type="button"
              onClick={() => place(token.id)}
              style={indentPad(token.indent)}
              className={`block min-h-11 w-full rounded-lg border border-dashed px-3 py-2 text-left font-mono text-[13px] ${
                filled
                  ? "border-cyan bg-cyan/10 text-cyan"
                  : picked
                    ? "border-amber bg-amber/10 text-amber"
                    : "border-line text-muted"
              }`}
            >
              {filled ? filled.text : "▸ вставьте команду"}
            </button>
          );
        })}
      </div>
      <div>
        <p className="mb-2 text-xs uppercase tracking-wider text-muted">Набор команд</p>
        <div className="flex flex-wrap gap-2">
          {level.bank.map((item) => {
            if (used.has(item.id)) return null;
            return (
              <Chip
                key={item.id}
                active={picked === item.id}
                onClick={() => setPicked(picked === item.id ? null : item.id)}
              >
                {item.text}
              </Chip>
            );
          })}
        </div>
      </div>
      <CheckButton disabled={!complete} onClick={() => onSubmit({ kind: "fill", slots })}>
        Вставить и проверить
      </CheckButton>
    </div>
  );
}

function FindPuzzle({
  level,
  onSubmit,
}: {
  level: PublicFindLevel;
  onSubmit: (answer: Answer) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length >= level.selectCount
          ? [...current.slice(1), id]
          : [...current, id],
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Отметьте {level.selectCount === 1 ? "лишнюю строку" : `${level.selectCount} лишние строки`}.
      </p>
      <div className="space-y-2">
        {level.lines.map((line, index) => {
          const active = selected.includes(line.id);
          return (
            <button
              key={line.id}
              type="button"
              onClick={() => toggle(line.id)}
              className={`flex min-h-12 w-full items-center rounded-xl border text-left ${
                active ? "border-red bg-red/10 text-red" : "border-line bg-soft"
              }`}
            >
              <span className="w-8 text-center font-mono text-xs text-muted">{index + 1}</span>
              <LineText line={line} />
            </button>
          );
        })}
      </div>
      <CheckButton
        disabled={selected.length !== level.selectCount}
        onClick={() => onSubmit({ kind: "find", selected })}
      >
        Удалить выбранное
      </CheckButton>
    </div>
  );
}

function ChoicePuzzle({
  level,
  onSubmit,
}: {
  level: PublicChoiceLevel;
  onSubmit: (answer: Answer) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  function pick(id: string) {
    if (!level.multiple) {
      setSelected([id]);
      return;
    }
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-base font-medium">{level.question}</p>
      {level.facts.length > 0 && (
        <ul className="space-y-1 rounded-2xl border border-line bg-black/20 p-3 text-sm text-muted">
          {level.facts.map((fact) => (
            <li key={fact}>· {fact}</li>
          ))}
        </ul>
      )}
      <div className="space-y-2">
        {level.options.map((option) => {
          const active = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => pick(option.id)}
              className={`w-full rounded-2xl border px-4 py-3 text-left text-sm ${
                active ? "border-cyan bg-cyan/10" : "border-line bg-soft hover:border-cyan/40"
              }`}
            >
              {option.text}
            </button>
          );
        })}
      </div>
      <CheckButton
        disabled={selected.length === 0}
        onClick={() => onSubmit({ kind: "choice", selected })}
      >
        Ответить
      </CheckButton>
    </div>
  );
}

const PAIR_COLORS = ["#3de0ff", "#ff4d8d", "#ffc44d", "#4ade80"];

function MatchPuzzle({
  level,
  onSubmit,
}: {
  level: PublicMatchLevel;
  onSubmit: (answer: Answer) => void;
}) {
  const [pairs, setPairs] = useState<Record<string, string>>({});
  const [leftId, setLeftId] = useState<string | null>(null);

  const usedRight = new Set(Object.values(pairs));

  function pickLeft(id: string) {
    if (pairs[id]) {
      setPairs((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return;
    }
    setLeftId(id);
  }

  function pickRight(id: string) {
    if (!leftId) return;
    setPairs((current) => ({ ...current, [leftId]: id }));
    setLeftId(null);
  }

  const complete = level.left.every((item) => pairs[item.id]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Сначала коснитесь фразы слева, затем функции справа. Нажмите пару ещё раз, чтобы отменить.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          {level.left.map((item, index) => {
            const paired = pairs[item.id];
            const color = paired ? PAIR_COLORS[index % PAIR_COLORS.length] : undefined;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => pickLeft(item.id)}
                className="w-full rounded-xl border px-3 py-3 text-left text-sm"
                style={{
                  borderColor: leftId === item.id || paired ? color ?? "#3de0ff" : "var(--line)",
                  background: leftId === item.id || paired ? "rgba(61,224,255,0.08)" : "var(--bg-soft)",
                }}
              >
                {item.text}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          {level.right.map((item) => {
            const taken = usedRight.has(item.id);
            const leftIndex = level.left.findIndex((left) => pairs[left.id] === item.id);
            const color = taken ? PAIR_COLORS[leftIndex % PAIR_COLORS.length] : undefined;
            return (
              <button
                key={item.id}
                type="button"
                disabled={taken}
                onClick={() => pickRight(item.id)}
                className="w-full rounded-xl border px-3 py-3 text-left font-mono text-[13px] disabled:opacity-70"
                style={{
                  borderColor: color ?? "var(--line)",
                  background: taken ? "rgba(61,224,255,0.08)" : "var(--bg-soft)",
                }}
              >
                {item.text}
              </button>
            );
          })}
        </div>
      </div>
      <CheckButton
        disabled={!complete}
        onClick={() => onSubmit({ kind: "match", pairs })}
      >
        Проверить соответствия
      </CheckButton>
    </div>
  );
}

function CheckButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full rounded-2xl bg-cyan px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function Puzzle({
  level,
  onSubmit,
}: {
  level: PublicLevel;
  onSubmit: (answer: Answer) => void;
}) {
  switch (level.kind) {
    case "order":
      return <OrderPuzzle key={level.id} level={level} onSubmit={onSubmit} />;
    case "fill":
      return <FillPuzzle key={level.id} level={level} onSubmit={onSubmit} />;
    case "find":
      return <FindPuzzle key={level.id} level={level} onSubmit={onSubmit} />;
    case "choice":
      return <ChoicePuzzle key={level.id} level={level} onSubmit={onSubmit} />;
    case "match":
      return <MatchPuzzle key={level.id} level={level} onSubmit={onSubmit} />;
  }
}
