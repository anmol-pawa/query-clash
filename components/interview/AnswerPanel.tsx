"use client";
import { type CSSProperties, useState } from "react";
import { Button } from "@/components/ui/kit";
import type { Question, Response } from "@/content/interview/types";
import { sfx } from "@/game/audio/synth";
import { moveStep } from "@/game/engine/interview";

const LETTERS = "ABCDEFGH";
const RIGHT = "#4ade80";
const WRONG = "#f87171";
const tone = (c: string) => ({ "--tone": c }) as CSSProperties;

/**
 * The answer controls for one question, by type. While `locked` (after an
 * answer) the choices show what was right (green) and what was picked wrong (red).
 * Remount with a `key` per question to reset it.
 */
export function AnswerPanel({ q, initialSteps, locked, picked, onAnswer }: { q: Question; initialSteps: string[]; locked: boolean; picked: Response | null; onAnswer: (r: Response) => void }) {
  switch (q.kind) {
    case "mcq":
      return (
        <ChoiceList
          choices={q.choices}
          locked={locked}
          isRight={(i) => i === q.answer}
          isPicked={(i) => picked?.kind === "mcq" && picked.choice === i}
          onPick={(i) => onAnswer({ kind: "mcq", choice: i })}
        />
      );
    case "truefalse":
      return (
        <div className="grid grid-cols-2 gap-2" data-answer="truefalse">
          {[true, false].map((v) => {
            const right = locked && v === q.answer;
            const wrong = locked && picked?.kind === "truefalse" && picked.value === v && !right;
            return (
              <button
                key={String(v)}
                disabled={locked}
                onClick={() => onAnswer({ kind: "truefalse", value: v })}
                className={`px-choice flex items-center justify-center gap-2 px-3 py-3 font-display text-base tracking-[0.15em] pointer-coarse:py-4 ${locked && !right && !wrong ? "opacity-45" : ""}`}
                style={right ? tone(RIGHT) : wrong ? tone(WRONG) : undefined}
              >
                <span className="px-key grid h-7 w-7 place-items-center text-sm" style={right ? { background: RIGHT, color: "#0e0f1a" } : wrong ? { background: WRONG, color: "#0e0f1a" } : undefined}>
                  {v ? "T" : "F"}
                </span>
                {v ? "TRUE" : "FALSE"}
              </button>
            );
          })}
        </div>
      );
    case "multi":
      return <MultiPanel q={q} locked={locked} picked={picked} onAnswer={onAnswer} />;
    case "order":
      return <OrderPanel initial={initialSteps} answer={q.steps} locked={locked} onAnswer={onAnswer} />;
    case "numeric":
    case "short":
      return <TextPanel q={q} locked={locked} onAnswer={onAnswer} />;
  }
}

function ChoiceList({ choices, locked, isRight, isPicked, onPick, multi = false }: { choices: string[]; locked: boolean; isRight: (i: number) => boolean; isPicked: (i: number) => boolean; onPick: (i: number) => void; multi?: boolean }) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-2" data-answer={multi ? "multi" : "mcq"}>
      {choices.map((c, i) => {
        const picked = isPicked(i);
        const right = locked && isRight(i);
        const wrong = locked && picked && !right;
        const color = right ? RIGHT : wrong ? WRONG : !locked && picked ? "var(--accent)" : undefined;
        return (
          <button
            key={c}
            disabled={locked}
            aria-pressed={multi ? picked : undefined}
            data-choice={i}
            onClick={() => onPick(i)}
            className={`px-choice flex items-center gap-2 px-2 py-2 text-left text-sm pointer-coarse:py-3 ${locked && !right && !wrong ? "opacity-45" : ""}`}
            style={color ? tone(color) : undefined}
          >
            <span className="px-key grid h-6 w-6 shrink-0 place-items-center font-display text-xs" style={color ? { background: color, color: "#0e0f1a" } : undefined}>
              {multi ? (picked ? "✓" : LETTERS[i]) : LETTERS[i]}
            </span>
            <span>{c}</span>
          </button>
        );
      })}
    </div>
  );
}

function MultiPanel({ q, locked, picked, onAnswer }: { q: Extract<Question, { kind: "multi" }>; locked: boolean; picked: Response | null; onAnswer: (r: Response) => void }) {
  const [sel, setSel] = useState<number[]>([]);
  const chosen = locked && picked?.kind === "multi" ? picked.choices : sel;
  return (
    <div>
      <p className="mb-1.5 font-display text-[11px] uppercase tracking-[0.15em] text-white/50">Pick every answer that applies</p>
      <ChoiceList
        multi
        choices={q.choices}
        locked={locked}
        isRight={(i) => q.answers.includes(i)}
        isPicked={(i) => chosen.includes(i)}
        onPick={(i) => {
          sfx.click();
          setSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
        }}
      />
      {!locked && <Submit disabled={sel.length === 0} onClick={() => onAnswer({ kind: "multi", choices: [...sel].sort((a, b) => a - b) })} />}
    </div>
  );
}

function OrderPanel({ initial, answer, locked, onAnswer }: { initial: string[]; answer: string[]; locked: boolean; onAnswer: (r: Response) => void }) {
  const [steps, setSteps] = useState(initial);
  const move = (i: number, d: -1 | 1) => {
    sfx.click();
    setSteps((s) => moveStep(s, i, d));
  };
  return (
    <div>
      <p className="mb-1.5 font-display text-[11px] uppercase tracking-[0.15em] text-white/50">Put the steps in order</p>
      <ol className="space-y-1.5" data-answer="order">
        {steps.map((s, i) => {
          const right = locked && answer[i] === s;
          const color = locked ? (right ? RIGHT : WRONG) : undefined;
          return (
            <li key={s} className="px-choice flex items-center gap-2 px-2 py-1.5 text-sm" style={color ? tone(color) : undefined} data-step={s}>
              <span className="px-key grid h-6 w-6 shrink-0 place-items-center font-display text-xs" style={color ? { background: color, color: "#0e0f1a" } : undefined}>
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">{s}</span>
              {!locked && (
                <span className="flex shrink-0 gap-1">
                  <button aria-label={`Move "${s}" up`} disabled={i === 0} onClick={() => move(i, -1)} className="px-key grid h-8 w-8 place-items-center text-xs disabled:opacity-30 pointer-coarse:h-10 pointer-coarse:w-10">
                    ▲
                  </button>
                  <button aria-label={`Move "${s}" down`} disabled={i === steps.length - 1} onClick={() => move(i, 1)} className="px-key grid h-8 w-8 place-items-center text-xs disabled:opacity-30 pointer-coarse:h-10 pointer-coarse:w-10">
                    ▼
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {!locked && <Submit onClick={() => onAnswer({ kind: "order", steps })} />}
    </div>
  );
}

function TextPanel({ q, locked, onAnswer }: { q: Extract<Question, { kind: "numeric" | "short" }>; locked: boolean; onAnswer: (r: Response) => void }) {
  const [text, setText] = useState("");
  const numeric = q.kind === "numeric";
  const value = Number(text.trim());
  const ok = numeric ? text.trim() !== "" && Number.isFinite(value) : text.trim() !== "";
  const submit = () => ok && !locked && onAnswer(numeric ? { kind: "numeric", value } : { kind: "short", text });
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      data-answer={q.kind}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label className="px-tray flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5">
        <span className="font-display text-[11px] text-white/50">{numeric ? "#" : "▸"}</span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={locked}
          inputMode={numeric ? "decimal" : "text"}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label={numeric ? "Your number" : "Your answer"}
          placeholder={numeric ? "Type a number" : "Type your answer"}
          className="min-w-0 flex-1 bg-transparent font-mono text-base text-white outline-none placeholder:text-white/30 sm:text-sm"
        />
        {numeric && q.unit && <span className="text-xs text-white/50">{q.unit}</span>}
      </label>
      {!locked && (
        <Button type="submit" variant="primary" disabled={!ok} className="pointer-coarse:py-3">
          ANSWER ▸
        </Button>
      )}
    </form>
  );
}

function Submit({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <div className="mt-2 flex justify-end">
      <Button variant="primary" onClick={onClick} disabled={disabled} className="pointer-coarse:py-3">
        ANSWER ▸
      </Button>
    </div>
  );
}
