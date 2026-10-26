import { SchemaLab } from "@/components/interview/SchemaLab";
import { NavLink } from "@/components/ui/kit";

export const metadata = { title: "Schema design drills · Query Clash" };

export default function SchemaPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <NavLink href="/interview">← Interview</NavLink>
        <h1 className="px-shadow font-display text-2xl tracking-[0.2em]">SCHEMA FORGE</h1>
      </header>
      <p className="mt-2 max-w-2xl text-sm text-white/60">
        Write the CREATE TABLE statements for each scenario. Your script runs on a real PostgreSQL engine in a scratch schema, and its keys, foreign keys and indexes are checked against the rules an interviewer would look for.
      </p>
      <div className="mt-4">
        <SchemaLab />
      </div>
    </main>
  );
}
