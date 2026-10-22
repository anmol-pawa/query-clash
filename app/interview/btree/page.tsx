import { BTreeVisualizer } from "@/components/interview/BTreeVisualizer";
import { NavLink } from "@/components/ui/kit";

export const metadata = { title: "B+ tree visualizer · Query Clash" };

export default function BTreePage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <NavLink href="/interview">← Interview</NavLink>
        <h1 className="px-shadow font-display text-2xl tracking-[0.2em]">B+ TREE LAB</h1>
      </header>
      <p className="mt-2 max-w-2xl text-sm text-white/60">
        Insert keys one at a time. A leaf that reaches n keys splits ceil(n/2) | rest and <em>copies</em> the first key of the right half up; an internal node that reaches n keys splits around its middle key, which <em>moves</em> up.
      </p>
      <div className="mt-4">
        <BTreeVisualizer />
      </div>
    </main>
  );
}
