"use client";
import { useRef, useState } from "react";
import { Button, NavLink } from "@/components/ui/kit";
import { StageHandle, StageView } from "@/components/battle/StageView";

/** Dev page: the real Pixi battle stage with buttons to trigger hit / faint, for screenshot review. */
export default function DevStagePage() {
  const stage = useRef<StageHandle>(null);
  const [ready, setReady] = useState(false);
  const [boss, setBoss] = useState(0);
  const BOSSES = ["joinmaster", "nulloth", "hydrax"] as const;
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-3 p-3">
      <NavLink href="/">← Menu</NavLink>
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-white/10" data-testid="dev-stage">
        <StageView key={boss} ref={stage} boss={BOSSES[boss]} accent="#60a5fa" reducedMotion={false} font="monospace" onReady={() => setReady(true)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={!ready} onClick={() => void stage.current?.stage()?.ko("right")}>Faint foe</Button>
        <Button disabled={!ready} onClick={() => void stage.current?.stage()?.ko("left")}>Faint player</Button>
        <Button disabled={!ready} onClick={() => { setReady(false); setBoss((boss + 1) % BOSSES.length); }}>Next foe</Button>
      </div>
    </main>
  );
}
