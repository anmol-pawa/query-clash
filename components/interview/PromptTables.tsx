import type { Relation } from "@/lib/dbms/algebra";

/** The small named relations of a relational-algebra problem, as pixel terminal tables. */
export function PromptTables({ tables }: { tables: Relation[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-start gap-2" data-testid="prompt-tables">
      {tables.map((t, i) => (
        <div key={`${t.name}-${i}`} className="px-term min-w-0 max-w-full overflow-x-auto">
          <div className="px-term-title px-2 py-0.5 font-display text-[11px] tracking-[0.15em]">
            {t.name}({t.columns.join(", ")})
          </div>
          <table className="w-full border-collapse font-mono text-[13px]">
            <thead>
              <tr>
                {t.columns.map((c) => (
                  <th key={c} className="border-b-2 border-[#1d2140] px-2.5 py-1 text-left font-normal text-sky-300/80">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.rows.map((row, ri) => (
                <tr key={ri} className="odd:bg-white/[0.03]">
                  {row.map((v, ci) => (
                    <td key={ci} className={`px-2.5 py-0.5 ${typeof v === "number" ? "text-right text-amber-200" : "text-white/85"}`}>
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
