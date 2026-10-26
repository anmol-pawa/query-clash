/** An EXPLAIN plan (or other preformatted output) shown under a question prompt. */
export function PlanBlock({ plan }: { plan: string }) {
  return (
    <pre
      className="mt-3 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-[11px] leading-snug text-emerald-100/90 sm:text-xs"
      data-testid="question-plan"
      tabIndex={0}
      aria-label="Query plan"
    >
      {plan}
    </pre>
  );
}
