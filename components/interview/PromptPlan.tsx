/** A block of monospace text (an EXPLAIN plan) shown under a question prompt; scrolls sideways on narrow screens. */
export function PromptPlan({ plan }: { plan: string }) {
  return (
    <pre className="mt-3 max-w-full overflow-x-auto rounded border border-white/15 bg-black/40 p-3 font-mono text-[12px] leading-snug text-emerald-100/90" data-testid="prompt-plan">
      {plan}
    </pre>
  );
}
