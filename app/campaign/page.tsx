"use client";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { OverworldMap } from "@/components/menu/OverworldMap";
import { SpriteCanvas } from "@/components/sprites/SpriteCanvas";
import { Chip, LinkButton, NavLink } from "@/components/ui/kit";
import { CHAPTERS } from "@/content/chapters";
import { sfx } from "@/game/audio/synth";
import { sqlClient } from "@/lib/db/client";
import { MAP_NODES } from "@/game/render/overworld";
import { bossSprite, starterSprite, starterStageOf } from "@/game/sprites/roster";
import { unlockedChapters, useSave } from "@/lib/save";

export default function CampaignPage() {
  const save = useSave();
  const unlocked = unlockedChapters(save);
  const [sel, setSel] = useState(unlocked);
  const ch = CHAPTERS[sel - 1];
  const starter = starterSprite("front", starterStageOf(save.dex));

  useEffect(() => {
    return sqlClient().warmupWhenIdle();
  }, []);
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", ch.color);
  }, [ch.color]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-7xl flex-col px-4 py-6">
      <header className="flex items-center gap-4">
        <NavLink href="/">← Menu</NavLink>
        <h1 className="font-display text-xl font-bold tracking-[0.25em]">CAMPAIGN</h1>
        <div className="ml-auto text-xs text-white/40">Beat a boss to unlock the next chapter</div>
      </header>

      <div className="mt-6 grid flex-1 gap-5 lg:grid-cols-[1fr_380px]">
        <div className="panel relative aspect-[5/3] w-full overflow-hidden p-0" data-testid="overworld">
          <OverworldMap unlocked={unlocked} className="absolute inset-0 h-full w-full" />
          {CHAPTERS.map((c, i) => {
            const [x, y] = MAP_NODES[i];
            const locked = c.n > unlocked;
            const stars = save.stars[c.n] ?? 0;
            const active = sel === c.n;
            return (
              <div key={c.n} className="pointer-events-none absolute" style={{ left: `${x}%`, top: `${y}%` }}>
                <motion.button
                  data-testid={`node-${c.n}`}
                  aria-label={locked ? `Chapter ${c.n} (locked)` : `Chapter ${c.n}: ${c.bossName}`}
                  aria-pressed={active}
                  initial={{ y: -12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 + i * 0.05, duration: 0.25, ease: "easeOut" }}
                  onHoverStart={() => !locked && sfx.hover()}
                  onClick={() => {
                    sfx.click();
                    setSel(c.n);
                  }}
                  className="pointer-events-auto absolute bottom-[-5px] left-0 flex w-11 sm:w-16 -translate-x-1/2 flex-col items-center rounded-[3px] outline-none focus-visible:outline-2 focus-visible:outline-white"
                >
                  {active && <span className="map-cursor font-display text-sm leading-none text-white sm:text-base">▼</span>}
                  <SpriteCanvas def={bossSprite(c.boss)} scale={1} silhouette={locked ? "#4a4f78" : undefined} label={locked ? "Unknown boss" : c.bossName} className={`h-11 w-11 sm:h-16 sm:w-16 ${locked ? "opacity-75" : ""} ${active ? "drop-shadow-[0_0_6px_rgba(255,255,255,0.7)]" : ""}`} />
                </motion.button>
                <div className="absolute left-0 top-[7px] flex -translate-x-1/2 items-center gap-0.5 whitespace-nowrap rounded-[3px] border-2 border-[#0e0f1a] px-1 font-display text-[10px] leading-[12px] sm:top-[10px] sm:text-xs" style={{ background: locked ? "#2b2f4a" : c.color, color: locked ? "rgba(255,255,255,0.45)" : "#0e0f1a" }}>
                  {c.n}
                  {stars > 0 && <span className="text-[#0e0f1a]">{"★".repeat(stars)}</span>}
                </div>
                {c.n === unlocked && (
                  <div className="map-hop absolute bottom-[-6px] w-7 sm:w-10 left-[-30px] sm:left-[-44px]" data-testid="map-starter">
                    <SpriteCanvas def={starter} scale={1} label={`${starter.name} is here`} className="h-7 w-7 sm:h-10 sm:w-10" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.aside key={ch.n} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="panel flex flex-col p-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: ch.color }}>
              Chapter {ch.n} · {ch.title}
            </div>
            <div className="mt-3 flex items-center gap-4">
              <div className="dex-screen flex h-20 w-20 shrink-0 items-end justify-center overflow-hidden">
                <SpriteCanvas def={bossSprite(ch.boss)} scale={1} silhouette={ch.n > unlocked ? "#141630" : undefined} className="h-[76px] w-[76px]" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-black tracking-wide" style={{ color: ch.color }}>
                  {ch.bossName}
                </h2>
                <div className="text-xs uppercase tracking-[0.25em] text-white/40">{ch.bossTitle}</div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-white/70">{ch.intro}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {ch.topics.map((t) => (
                <Chip key={t} color={ch.color}>
                  {t}
                </Chip>
              ))}
            </div>
            <h3 className="mt-5 text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">Rounds</h3>
            <ol className="mt-2 space-y-1.5 text-sm">
              {ch.missions.map((m, i) => (
                <li key={m.id} className="flex items-center gap-2">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] border-2 border-[#0e0f1a] font-display text-[10px] ${save.cleared.includes(m.id) ? "bg-emerald-400 text-black" : "bg-[#2b2f4a] text-white/60"}`}>{save.cleared.includes(m.id) ? "✓" : i + 1}</span>
                  <span className="text-white/80">{m.title}</span>
                  {m.kind === "defense" && <span className="text-[10px] uppercase tracking-widest text-rose-300">defend</span>}
                </li>
              ))}
            </ol>
            <div className="mt-auto pt-6">
              {ch.n <= unlocked ? (
                <LinkButton href={`/battle/${ch.n}`} onClick={() => sfx.unlock()} variant="primary" size="lg" className="w-full font-display tracking-[0.3em]">
                  ENTER BATTLE
                </LinkButton>
              ) : (
                <div className="px-window p-3 text-center text-sm text-white/55">Defeat {CHAPTERS[ch.n - 2].bossName} to unlock.</div>
              )}
            </div>
          </motion.aside>
        </AnimatePresence>
      </div>
    </main>
  );
}
