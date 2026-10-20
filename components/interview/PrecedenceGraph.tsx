import type { PrecedenceGraphSpec } from "@/content/interview/types";

/** Node centres in a 160×112 box: a row for two transactions, a triangle for three, a square for four, a ring beyond. */
function layout(n: number): [number, number][] {
  if (n === 1) return [[80, 56]];
  if (n === 2) return [[36, 56], [124, 56]];
  if (n === 3) return [[80, 22], [132, 90], [28, 90]];
  if (n === 4) return [[30, 22], [130, 22], [130, 90], [30, 90]];
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return [80 + 58 * Math.cos(a), 56 + 40 * Math.sin(a)] as [number, number];
  });
}

const HALF = 12;
const snap = (v: number) => Math.round(v);

/** Where the segment from the centre towards (dx, dy) leaves the node's square, pushed out a little. */
function exitPoint(cx: number, cy: number, dx: number, dy: number, pad: number): [number, number] {
  const t = (HALF + pad) / Math.max(Math.abs(dx), Math.abs(dy));
  return [cx + dx * t, cy + dy * t];
}

/** A precedence graph as a pixel diagram: square transaction nodes, arrowed edges, and any cycle drawn in red. */
export function PrecedenceGraph({ graph, title = "Precedence graph" }: { graph: PrecedenceGraphSpec; title?: string }) {
  const pos = layout(graph.nodes.length);
  const at = new Map(graph.nodes.map((t, i) => [t, pos[i]]));
  const onCycle = new Set<string>();
  if (graph.cycle) for (let i = 0; i + 1 < graph.cycle.length; i++) onCycle.add(`${graph.cycle[i]},${graph.cycle[i + 1]}`);
  const has = new Set(graph.edges.map(([a, b]) => `${a},${b}`));
  const label = graph.edges.length ? graph.edges.map(([a, b]) => `T${a} → T${b}`).join(", ") : "no edges";

  return (
    <div className="px-term mt-3 inline-block max-w-full" data-testid="precedence-graph" data-edges={graph.edges.length}>
      <div className="px-term-title px-2 py-0.5 font-display text-[11px] tracking-[0.15em]">{title}</div>
      <svg viewBox="0 0 160 112" width={320} height={224} className="block h-auto max-w-full" role="img" aria-label={`${title}: ${label}`} shapeRendering="crispEdges">
        <defs>
          <pattern id="pg-grid" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#090a14" />
            <rect width="1" height="1" fill="#1a1d33" />
          </pattern>
        </defs>
        <rect width="160" height="112" fill="url(#pg-grid)" />
        {graph.edges.map(([a, b]) => {
          const [x1, y1] = at.get(a)!;
          const [x2, y2] = at.get(b)!;
          let dx = x2 - x1;
          let dy = y2 - y1;
          const len = Math.hypot(dx, dy);
          dx /= len;
          dy /= len;
          // Two-way pairs are drawn as parallel lines, each shifted to its own side.
          const shift = has.has(`${b},${a}`) ? 4 : 0;
          const ox = -dy * shift;
          const oy = dx * shift;
          const [sx, sy] = exitPoint(x1 + ox, y1 + oy, dx, dy, 2);
          const [ex, ey] = exitPoint(x2 + ox, y2 + oy, -dx, -dy, 3);
          const red = onCycle.has(`${a},${b}`);
          const color = red ? "#f87171" : "#7dd3fc";
          const head = [
            [ex, ey],
            [ex - dx * 7 - dy * 4, ey - dy * 7 + dx * 4],
            [ex - dx * 7 + dy * 4, ey - dy * 7 - dx * 4],
          ]
            .map(([x, y]) => `${snap(x)},${snap(y)}`)
            .join(" ");
          return (
            <g key={`${a}-${b}`} data-testid="pg-edge" data-cycle={red || undefined}>
              <line x1={snap(sx)} y1={snap(sy)} x2={snap(ex - dx * 5)} y2={snap(ey - dy * 5)} stroke="#0e0f1a" strokeWidth={4} />
              <line x1={snap(sx)} y1={snap(sy)} x2={snap(ex - dx * 5)} y2={snap(ey - dy * 5)} stroke={color} strokeWidth={2} />
              <polygon points={head} fill={color} stroke="#0e0f1a" strokeWidth={1} />
            </g>
          );
        })}
        {graph.nodes.map((t, i) => {
          const [cx, cy] = pos[i];
          const x = snap(cx - HALF);
          const y = snap(cy - HALF);
          const red = graph.cycle?.includes(t);
          return (
            <g key={t} data-testid="pg-node">
              <rect x={x} y={y + 2} width={HALF * 2} height={HALF * 2} fill="#000" opacity={0.45} />
              <rect x={x} y={y} width={HALF * 2} height={HALF * 2} fill="#0e0f1a" />
              <rect x={x + 2} y={y + 2} width={HALF * 2 - 4} height={HALF * 2 - 4} fill={red ? "#7f1d1d" : "#1e3a5f"} />
              <rect x={x + 2} y={y + 2} width={HALF * 2 - 4} height={3} fill={red ? "#b91c1c" : "#2f5d8f"} />
              <rect x={x + 2} y={y + HALF * 2 - 5} width={HALF * 2 - 4} height={3} fill={red ? "#5b1313" : "#16294a"} />
              <text x={cx} y={cy + 3.5} textAnchor="middle" fontSize={9} fill="#f8fafc" className="font-display" style={{ fontFamily: "var(--font-display)" }}>
                T{t}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
