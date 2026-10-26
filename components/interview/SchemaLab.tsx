"use client";
import { useEffect, useState } from "react";
import { SCHEMA_DRILLS } from "@/content/interview/schemaScenarios";
import type { SchemaGrade } from "@/lib/dbms/schemaDesign";
import { sqlClient, useDbStatus } from "@/lib/db/client";
import { Button } from "@/components/ui/kit";

const OK = "#4ade80";
const BAD = "#f87171";

/** Build-the-tables drills: write DDL, grade it on PGlite against the scenario's rules. */
export function SchemaLab() {
  const status = useDbStatus();
  const [sel, setSel] = useState(SCHEMA_DRILLS[0].id);
  const [sql, setSql] = useState<Record<string, string>>(() => Object.fromEntries(SCHEMA_DRILLS.map((d) => [d.id, d.starter])));
  const [grades, setGrades] = useState<Record<string, SchemaGrade>>({});
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState(false);
  const drill = SCHEMA_DRILLS.find((d) => d.id === sel)!;
  const grade = grades[sel];

  useEffect(() => sqlClient().warmupWhenIdle(), []);

  const check = async () => {
    setBusy(true);
    const g = await sqlClient().gradeSchema(sel, sql[sel]);
    setGrades((x) => ({ ...x, [sel]: g }));
    setBusy(false);
  };

  return (
    <div data-testid="schema-lab">
      <div className="flex flex-wrap gap-2" role="tablist">
        {SCHEMA_DRILLS.map((d) => (
          <button
            key={d.id}
            role="tab"
            aria-selected={d.id === sel}
            data-testid={`drill-${d.id}`}
            onClick={() => {
              setSel(d.id);
              setHint(false);
            }}
            className={`px-btn pointer-coarse:min-h-11 px-3 py-1.5 text-sm ${d.id === sel ? "px-btn-primary text-[#06040d]" : "text-white/80"}`}
          >
            {d.icon} {d.title}
            {grades[d.id]?.ok && <span style={{ color: d.id === sel ? "#06040d" : OK }}> ✔</span>}
          </button>
        ))}
      </div>

      <section className="px-window mt-4 p-4">
        <p className="text-sm text-white/80" data-testid="drill-brief">
          {drill.brief}
        </p>
        <textarea
          aria-label="CREATE TABLE script"
          data-testid="schema-editor"
          value={sql[sel]}
          onChange={(e) => setSql((x) => ({ ...x, [sel]: e.target.value }))}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          rows={14}
          className="mt-3 block w-full rounded border border-white/15 bg-black/40 p-3 font-mono text-[16px] leading-snug text-white/90 outline-none focus:border-white/40"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="primary" size="lg" onClick={check} disabled={busy || status !== "ready"} data-testid="schema-check">
            {busy ? "Checking…" : status === "ready" ? "▶ Check design" : "Booting database…"}
          </Button>
          <Button variant="ghost" onClick={() => setHint((h) => !h)}>
            {hint ? "Hide hint" : "💡 Hint"}
          </Button>
          <Button variant="ghost" onClick={() => setSql((x) => ({ ...x, [sel]: drill.starter }))}>
            Reset
          </Button>
        </div>
        {hint && <p className="mt-3 text-sm text-amber-200/90">{drill.hint}</p>}
      </section>

      {grade && (
        <section className="px-window mt-4 p-4" data-testid="schema-result">
          {grade.error ? (
            <>
              <h2 className="font-display text-sm tracking-[0.15em]" style={{ color: BAD }}>
                SQL ERROR
              </h2>
              <pre className="mt-2 overflow-x-auto font-mono text-xs whitespace-pre-wrap text-white/80">{grade.error}</pre>
            </>
          ) : (
            <>
              <h2 className="font-display text-sm tracking-[0.15em]" style={{ color: grade.ok ? OK : "#facc15" }} data-testid="schema-score">
                {grade.ok ? `DESIGN APPROVED · ${grade.passed}/${grade.total}` : `${grade.passed}/${grade.total} CHECKS PASSED`}
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {grade.results.map((r) => (
                  <li key={r.label} className="flex gap-2">
                    <span style={{ color: r.ok ? OK : BAD }}>{r.ok ? "✔" : "✘"}</span>
                    <span>
                      <span className={r.ok ? "text-white/80" : "text-white"}>{r.label}</span>
                      {r.detail && <span className="block text-xs text-white/55">{r.detail}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  );
}
