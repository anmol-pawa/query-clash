import type { Dialect } from "../dialect/lint";
import type { SchemaGrade } from "../dbms/schemaDesign";
import type { ResultSet, RunResult, Verdict } from "./engine";

export type Request =
  | { type: "run"; sql: string; dialect: Dialect }
  | { type: "evaluate"; missionId: string; sql: string; dialect: Dialect }
  | { type: "expected"; missionId: string; dialect: Dialect }
  | { type: "gradeSchema"; specId: string; ddl: string }
  | { type: "reset" };

export type Response = RunResult | Verdict | ResultSet | null | SchemaGrade | { ok: true };

export interface Envelope {
  id: number;
  req: Request;
}
export interface Reply {
  id: number;
  ok: boolean;
  data?: Response;
  error?: string;
}
