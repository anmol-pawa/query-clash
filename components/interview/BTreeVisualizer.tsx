"use client";
import { useMemo, useState } from "react";
import { BNode, BTree, SplitEvent, build, has, height, insert, leaves, levels, searchPath } from "@/lib/dbms/btree";
import { Button } from "@/components/ui/kit";

const NODE_H = 28;
const GAP_Y = 44;
const CELL = 26;
const GAP_X = 10;

interface Placed {
  node: BNode;
  x: number;
  y: number;
  w: number;
}

const widthOf = (n: BNode) => Math.max(1, n.keys.length) * CELL + 6;

/** Lay the tree out: leaves left to right with gaps, each parent centred over its children. */
function layout(t: BTree): { placed: Map<BNode, Placed>; width: number; heightPx: number } {
  const placed = new Map<BNode, Placed>();
  let cursor = 0;
  const walk = (n: BNode, depth: number): Placed => {
    const w = widthOf(n);
    let x: number;
    if (n.leaf) {
      x = cursor;
      cursor += w + GAP_X;
    } else {
      const kids = n.children.map((c) => walk(c, depth + 1));
      const left = kids[0].x;
      const right = kids[kids.length - 1].x + kids[kids.length - 1].w;
      x = (left + right) / 2 - w / 2;
    }
    const p = { node: n, x, y: depth * (NODE_H + GAP_Y), w };
    placed.set(n, p);
    return p;
  };
  walk(t.root, 0);
  return { placed, width: Math.max(cursor - GAP_X, widthOf(t.root)), heightPx: height(t) * (NODE_H + GAP_Y) - GAP_Y };
}

const ORDERS = [3, 4, 5];
const SEED = [10, 20, 30, 40, 50];

/** Type a key, watch the tree descend and split. Silberschatz's convention (see lib/dbms/btree.ts). */
export function BTreeVisualizer() {
  const [order, setOrder] = useState(4);
  const [keys, setKeys] = useState<number[]>([]);
  const [text, setText] = useState("");
  const [note, setNote] = useState("Insert a key to begin.");
  const [splits, setSplits] = useState<SplitEvent[]>([]);
  const [last, setLast] = useState<number | null>(null);

  const tree = useMemo(() => build(order, keys), [order, keys]);
  const { placed, width, heightPx } = useMemo(() => layout(tree), [tree]);
  const onPath = new Set(last === null ? [] : searchPath(tree, last));

  const add = (k: number) => {
    if (!Number.isFinite(k)) return;
    if (has(tree, k)) {
      setNote(`${k} is already in the tree (keys are unique).`);
      setSplits([]);
      setLast(k);
      return;
    }
    const before = build(order, keys);
    const log: SplitEvent[] = [];
    insert(before, k, log);
    setKeys([...keys, k]);
    setSplits(log);
    setLast(k);
    const grew = height(before) > height(tree);
    setNote(log.length === 0 ? `Inserted ${k}: the leaf had room, so no split.` : `Inserted ${k}: ${log.length} split${log.length > 1 ? "s" : ""}${grew ? ", and the root split so the tree grew a level" : ""}.`);
  };

  const submit = () => {
    const k = Number.parseInt(text, 10);
    setText("");
    add(k);
  };

  const reset = (o = order) => {
    setOrder(o);
    setKeys([]);
    setSplits([]);
    setLast(null);
    setNote("Insert a key to begin.");
  };

  const lv = levels(tree);
  const maxKeys = order - 1;

  return (
    <section className="px-window p-4" data-testid="btree-viz">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-[11px] tracking-[0.15em] uppercase text-white/60">Order n</span>
        {ORDERS.map((o) => (
          <button key={o} aria-pressed={order === o} onClick={() => reset(o)} className="px-tab px-3 py-1 text-xs pointer-coarse:py-2" style={{ "--tab": "#60a5fa" } as React.CSSProperties}>
            {o}
          </button>
        ))}
        <span className="text-xs text-white/50">≤ {maxKeys} keys per node</span>
      </div>

      <form
        className="mt-3 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          aria-label="Key to insert"
          data-testid="btree-input"
          inputMode="numeric"
          value={text}
          onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
          placeholder="key"
          className="w-24 rounded-[3px] border-2 border-[#0e0f1a] bg-[#090a14] px-2 py-1.5 font-mono text-base text-white"
        />
        <Button type="submit" variant="primary" size="sm" disabled={text === ""}>
          Insert
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setKeys([...keys, ...SEED.filter((k) => !keys.includes(k))]);
            setSplits([]);
            setLast(null);
            setNote("Added 10, 20, 30, 40, 50. Now insert more and watch the splits.");
          }}
        >
          Add 10…50
        </Button>
        <Button variant="ghost" size="sm" onClick={() => reset()}>
          Clear
        </Button>
      </form>

      <p className="mt-3 min-h-[2.5rem] text-sm text-white/80" aria-live="polite" data-testid="btree-note">
        {note}
      </p>

      <div className="dex-screen mt-2 overflow-x-auto p-3 scroll-thin" data-testid="btree-canvas">
        <svg role="img" aria-label={`B+ tree of order ${order}: ${lv.map((l) => l.map((n) => `[${n.keys.join(" ")}]`).join(" ")).join(", ")}`} width={width + 16} height={heightPx + 16} viewBox={`-8 -8 ${width + 16} ${heightPx + 16}`} className="mx-auto block max-w-none">
          {[...placed.values()].map((p) =>
            p.node.children.map((c, i) => {
              const q = placed.get(c)!;
              return <line key={`${p.y}-${p.x}-${i}`} x1={p.x + (p.w * (i + 0.5)) / p.node.children.length} y1={p.y + NODE_H} x2={q.x + q.w / 2} y2={q.y} stroke={onPath.has(p.node) && onPath.has(c) ? "#facc15" : "#6b7098"} strokeWidth={2} shapeRendering="crispEdges" />;
            }),
          )}
          {leaves(tree).map((l, i, all) => {
            if (i === all.length - 1) return null;
            const a = placed.get(l)!;
            const b = placed.get(all[i + 1])!;
            return <line key={`chain-${i}`} x1={a.x + a.w} y1={a.y + NODE_H / 2} x2={b.x} y2={b.y + NODE_H / 2} stroke="#34d399" strokeWidth={2} strokeDasharray="3 2" shapeRendering="crispEdges" />;
          })}
          {[...placed.values()].map((p) => {
            const hot = onPath.has(p.node);
            return (
              <g key={`${p.y}-${p.x}`} transform={`translate(${p.x} ${p.y})`}>
                <rect width={p.w} height={NODE_H} fill={p.node.leaf ? "#12301f" : "#1b2146"} stroke={hot ? "#facc15" : p.node.leaf ? "#34d399" : "#60a5fa"} strokeWidth={2} shapeRendering="crispEdges" />
                {p.node.keys.map((k, i) => (
                  <text key={i} x={3 + i * CELL + CELL / 2} y={NODE_H / 2 + 4} textAnchor="middle" fontSize={12} fontFamily="monospace" fill="#fff">
                    {k}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      {splits.length > 0 && (
        <ol className="mt-3 space-y-1 text-xs text-white/75" data-testid="btree-splits">
          {splits.map((s, i) => (
            <li key={i}>
              {s.leaf ? "Leaf" : "Internal node"} split → [{s.left.join(" | ")}] and [{s.right.join(" | ")}]; {s.leaf ? `${s.up} is copied up` : `${s.up} moves up`}.
            </li>
          ))}
        </ol>
      )}
      <p className="mt-3 text-[11px] text-white/45">Yellow = the search path read for the new key. Dashed green = leaf sibling pointers. {tree.root.leaf ? "" : `Height ${height(tree)}, so a lookup reads ${height(tree)} nodes.`}</p>
    </section>
  );
}
