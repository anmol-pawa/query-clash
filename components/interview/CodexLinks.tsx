import Link from "next/link";
import { CODEX } from "@/content/codex";
import { relatedCodex } from "@/content/interview/codexLinks";
import type { Question } from "@/content/interview";

/** "Read more" links from an explanation to the matching Codex entries (opened in study mode). */
export function CodexLinks({ q }: { q: Pick<Question, "tags"> }) {
  const entries = relatedCodex(q)
    .map((id) => CODEX.find((e) => e.id === id))
    .filter((e) => e !== undefined);
  if (entries.length === 0) return null;
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/45" data-testid="codex-links">
      <span>Codex ▸</span>
      {entries.map((e) => (
        <Link key={e.id} href={`/codex?entry=${e.id}`} className="py-1 text-sky-300 underline underline-offset-2 pointer-coarse:py-2">
          {e.title}
        </Link>
      ))}
    </p>
  );
}
