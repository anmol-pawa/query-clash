"use client";
import { motion } from "motion/react";
import { hpTone } from "@/game/engine/hud";
import { SqlType, TYPE_INFO } from "@/game/engine/types";

const TONE = { high: "#3ccf6e", mid: "#f2c22e", low: "#ee4b3a" } as const;
const TONE_SHADE = { high: "#2a9a50", mid: "#c08f12", low: "#b02f24" } as const;

/**
 * A handheld-console HP box: name and level on a cream card with a hard pixel
 * border, an "HP" tag in front of a three-band bar (green / yellow / red), and
 * for the player the HP numbers and an XP bar. The foe's box sits top-left of
 * the stage and the player's bottom-right.
 */
export function HpBox({ side, type, name, level, hp, maxHp, xp, active = false, className = "" }: { side: "foe" | "player"; type?: SqlType; name: string; level: number; hp: number; maxHp: number; xp?: number; active?: boolean; className?: string }) {
  const pct = Math.max(0, Math.min(1, maxHp > 0 ? hp / maxHp : 0));
  const tone = hpTone(hp, maxHp);
  const isPlayer = side === "player";
  return (
    <div
      data-hpbox={side}
      data-active={active || undefined}
      className={`pointer-events-none w-[min(46%,250px)] select-none font-mono text-[#2a2c3a] ${className}`}
      style={{ filter: "drop-shadow(0 3px 0 rgba(0,0,0,0.45))" }}
    >
      <div
        className="relative border-[3px] border-[#2a2c3a] bg-[#f6f2d8] px-2 pb-1.5 pt-1 sm:px-2.5"
        style={{
          boxShadow: "inset 0 0 0 2px #fffdf0, inset 0 -3px 0 2px #d8d0a8",
          borderRadius: isPlayer ? "8px 2px 2px 8px" : "2px 8px 8px 2px",
        }}
      >
        <div className="flex items-baseline gap-1">
          {active && <span className="animate-pulse text-[10px] leading-none text-[#e05030]">▶</span>}
          <span className="min-w-0 flex-1 truncate text-[11px] font-black uppercase leading-tight tracking-wide sm:text-[13px]" data-testid={`${side}-name`}>
            {name}
          </span>
          {type && <TypeTag type={type} className="self-center" />}
          <span className="shrink-0 text-[10px] font-black leading-tight sm:text-[12px]" data-testid={`${side}-level`}>
            <span className="text-[8px] sm:text-[9px]">Lv</span>
            {level}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1">
          <span className="shrink-0 rounded-[2px] bg-[#e0782a] px-[3px] text-[8px] font-black leading-[11px] text-[#fff6c8] sm:text-[9px]" style={{ boxShadow: "inset 0 -1px 0 #9c4a12" }}>
            HP
          </span>
          <div className="relative h-[7px] flex-1 border-2 border-[#2a2c3a] bg-[#3a3c4a] sm:h-[9px]" data-testid={`${side}-hp`} data-tone={tone}>
            <motion.div className="absolute inset-y-0 left-0 bg-[#f8f0c8]/70" animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.9, delay: 0.35, ease: "easeOut" }} />
            <motion.div
              className="absolute inset-y-0 left-0"
              style={{ background: `linear-gradient(${TONE[tone]} 0 55%, ${TONE_SHADE[tone]} 55% 100%)` }}
              animate={{ width: `${pct * 100}%` }}
              transition={{ type: "spring", stiffness: 140, damping: 20 }}
            />
          </div>
        </div>
        {isPlayer && (
          <>
            <div className="mt-0.5 text-right text-[10px] font-black leading-tight tabular-nums sm:text-[12px]">
              {Math.max(0, Math.round(hp))}
              <span className="mx-0.5 text-[#6a6c78]">/</span>
              {maxHp}
            </div>
            {xp !== undefined && (
              <div className="mt-0.5 flex items-center gap-1">
                <span className="shrink-0 text-[7px] font-black leading-none text-[#4a6ab0] sm:text-[8px]">EXP</span>
                <div className="relative h-[4px] flex-1 border border-[#2a2c3a] bg-[#3a3c4a]" data-testid="player-xp">
                  <motion.div className="absolute inset-y-0 left-0 bg-[#48a8f0]" animate={{ width: `${Math.max(0, Math.min(1, xp)) * 100}%` }} transition={{ duration: 0.6, ease: "easeOut" }} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** A small pixel type badge (e.g. JOIN) in the type's colour. */
export function TypeTag({ type, className = "" }: { type: SqlType; className?: string }) {
  const t = TYPE_INFO[type];
  return (
    <span
      data-type={type}
      className={`inline-block shrink-0 rounded-[2px] px-[3px] font-mono text-[7px] font-black uppercase leading-[10px] tracking-wide text-white sm:text-[8px] ${className}`}
      style={{ background: t.color, boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.35), 0 0 0 1px #2a2c3a" }}
    >
      <span aria-hidden>{t.symbol} </span>
      {t.name}
    </span>
  );
}
