"use client";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { SPELLS, Spell, plainTemplate } from "@/content/spells";
import { sfx } from "@/game/audio/synth";
import type { Dialect } from "@/lib/dialect/lint";

const GROUP_COLOR: Record<Spell["group"], string> = {
  Core: "#5eead4",
  Filter: "#67e8f9",
  Join: "#fbbf24",
  Aggregate: "#fb923c",
  Subquery: "#a78bfa",
  Write: "#60a5fa",
  Txn: "#34d399",
  DDL: "#f59e0b",
  Window: "#38bdf8",
  CTE: "#4ade80",
  Pro: "#e879f9",
};

/** Clause cards: click to insert as a snippet, or drag onto the editor. */
export function SpellDeck({ dialect, maxChapter, onCast }: { dialect: Dialect; maxChapter: number; onCast: (tpl: string) => void }) {
  const groups = useMemo(() => [...new Set(SPELLS.filter((s) => s.chapter <= maxChapter).map((s) => s.group))], [maxChapter]);
  const [group, setGroup] = useState<Spell["group"]>(groups[groups.length - 1] ?? "Core");
  const active = groups.includes(group) ? group : groups[0];
  const cards = SPELLS.filter((s) => s.group === active && s.chapter <= maxChapter);

  return (
    <div className="flex flex-col gap-2" data-testid="spell-deck">
      <div className="flex flex-wrap gap-1">
        {groups.map((g) => (
          <button
            key={g}
            onClick={() => {
              sfx.click();
              setGroup(g);
            }}
            aria-pressed={g === active}
            className="px-tab px-2 py-0.5 text-[11px] uppercase tracking-wide"
            style={{ "--tab": GROUP_COLOR[g], color: g === active ? "#fff" : GROUP_COLOR[g] } as React.CSSProperties}
          >
            {g}
          </button>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scroll-thin">
        {cards.map((c, i) => (
          <motion.button
            key={c.id}
            draggable
            onDragStart={(e) => {
              const ev = e as unknown as React.DragEvent;
              ev.dataTransfer.setData("text/plain", plainTemplate(c.tpl[dialect]));
              ev.dataTransfer.effectAllowed = "copy";
            }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, type: "spring", stiffness: 300, damping: 22 }}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.95 }}
            onHoverStart={() => sfx.hover()}
            onClick={() => {
              sfx.card();
              onCast(c.tpl[dialect]);
            }}
            title={`${c.desc}\n\n${plainTemplate(c.tpl[dialect])}`}
            className="px-card relative flex w-[104px] shrink-0 cursor-grab flex-col items-start gap-1 overflow-hidden p-2.5 pt-3 text-left active:cursor-grabbing"
            style={{ "--card": GROUP_COLOR[c.group] } as React.CSSProperties}
          >
            <span className="font-mono text-[12px] font-bold leading-tight" style={{ color: GROUP_COLOR[c.group] }}>
              {c.label}
            </span>
            <span className="text-[10px] leading-snug text-white/55">{c.desc}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
