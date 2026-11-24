import type { Env } from "./types";

const JSON_COLUMNS = new Set(["parent_ids", "conditions", "action", "result", "details", "key_points", "topics", "entities", "action_items"]);
const TABLES = new Set([
  "connected_google_accounts", "drive_files", "sharing_requests", "permission_records", "sharing_collections",
  "collection_files", "collection_members", "automation_rules", "automation_executions", "scheduled_access_actions",
  "application_notifications", "audit_logs", "owner_sessions", "owner_access_events", "drive_sync_states",
  "ai_document_insights", "ai_jobs"
]);

function parsePath(path: string) {
  const [tablePart, queryString = ""] = path.split("?");
  const table = tablePart.split("/")[0];
  if (!TABLES.has(table)) throw new Error(`Unsupported D1 table: ${table}`);
  return { table, params: new URLSearchParams(queryString) };
}
function jsonValue(value: unknown) {
  return value === undefined ? null : value;
}
function encodeValue(column: string, value: unknown) {
  if (JSON_COLUMNS.has(column) && value !== null && typeof value === "object") return JSON.stringify(value);
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === "boolean") return value ? 1 : 0;
  return value;
}
function decodeRows<T>(rows: T[]): T[] {
  return rows.map(row => {
    if (!row || typeof row !== "object") return row;
    const copy = { ...(row as Record<string, unknown>) };
    for (const column of JSON_COLUMNS) {
      if (typeof copy[column] === "string") {
        try { copy[column] = JSON.parse(copy[column] as string); } catch { /* Keep malformed legacy values readable. */ }
      }
    }
    for (const column of ["enabled", "preview_only", "is_folder", "trashed"]) {
      if (copy[column] === 0 || copy[column] === 1) copy[column] = Boolean(copy[column]);
    }
    return copy as T;
  });
}
function parseFilter(value: string) {
  if (value.startsWith("eq.")) return { op: "=", value: value.slice(3) };
  if (value.startsWith("gte.")) return { op: ">=", value: value.slice(4) };
  if (value.startsWith("lte.")) return { op: "<=", value: value.slice(4) };
  if (value.startsWith("gt.")) return { op: ">", value: value.slice(3) };
  if (value.startsWith("lt.")) return { op: "<", value: value.slice(3) };
  if (value.startsWith("is.")) return { op: value.slice(3) === "null" ? "IS NULL" : "IS NOT NULL", value: null };
  if (value.startsWith("in.(") && value.endsWith(")")) return { op: "IN", value: value.slice(4, -1).split(",") };
  return null;
}
function sqlValue(column: string, value: unknown) {
  if (value === "null") return null;
  if (value === "true") return 1;
  if (value === "false") return 0;
  return encodeValue(column, value);
}
function whereClause(params: URLSearchParams) {
  const clauses: string[] = [];
  const values: unknown[] = [];
  for (const [column, raw] of params.entries()) {
    if (["select", "order", "limit", "offset", "on_conflict"].includes(column)) continue;
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(column)) continue;
    const filter = parseFilter(raw);
    if (!filter) continue;
    if (filter.op === "IS NULL" || filter.op === "IS NOT NULL") clauses.push(`${column} ${filter.op}`);
    else if (filter.op === "IN") {
      const items = filter.value as string[];
      clauses.push(`${column} IN (${items.map(() => "?").join(",")})`);
      values.push(...items.map(item => sqlValue(column, item)));
    } else {
      clauses.push(`${column} ${filter.op} ?`);
      values.push(sqlValue(column, filter.value));
    }
  }
  return { sql: clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "", values };
}
async function selectRows<T>(env: Env, table: string, params: URLSearchParams): Promise<T[]> {
  const selection = params.get("select") || "*";
  const columns = selection === "*" ? "*" : selection.split(",").filter(column => /^[A-Za-z_][A-Za-z0-9_]*$/.test(column)).join(",") || "*";
  const where = whereClause(params);
  let sql = `SELECT ${columns} FROM ${table}${where.sql}`;
  const order = params.get("order");
  if (order) {
    const orderParts = order.split(",").map(part => { const [column, direction = "asc"] = part.split("."); return /^[A-Za-z_][A-Za-z0-9_]*$/.test(column) ? `${column} ${direction.toLowerCase() === "desc" ? "DESC" : "ASC"}` : ""; }).filter(Boolean);
    if (orderParts.length) sql += ` ORDER BY ${orderParts.join(",")}`;
  }
  const limit = Number(params.get("limit"));
  const offset = Number(params.get("offset"));
  if (Number.isFinite(limit) && limit > 0) { sql += " LIMIT ?"; where.values.push(Math.floor(limit)); }
  if (Number.isFinite(offset) && offset >= 0) { if (!Number.isFinite(limit) || limit <= 0) sql += " LIMIT -1"; sql += " OFFSET ?"; where.values.push(Math.floor(offset)); }
  const result = await env.DB.prepare(sql).bind(...where.values).all<T>();
  return decodeRows(result.results || []);
}

export async function db<T>(env: Env, path: string, init: RequestInit = {}): Promise<T> {
  const { table, params } = parsePath(path);
  const method = (init.method || "GET").toUpperCase();
  if (method === "GET") return await selectRows<T>(env, table, params) as T;

  const rawBody = init.body ? JSON.parse(String(init.body)) as Record<string, unknown> | Array<Record<string, unknown>> : {};
  const records = Array.isArray(rawBody) ? rawBody : [rawBody];
  const prefer = init.headers instanceof Headers ? init.headers.get("Prefer") || "" : String((init.headers as Record<string, string> | undefined)?.Prefer || "");
  const conflict = params.get("on_conflict")?.split(",").filter(column => /^[A-Za-z_][A-Za-z0-9_]*$/.test(column)) || [];

  if (method === "POST") {
    for (const record of records) {
      const entries = Object.entries(record).filter(([column]) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(column));
      if (!entries.length) continue;
      const columns = entries.map(([column]) => column);
      const values = entries.map(([column, value]) => encodeValue(column, jsonValue(value)));
      const placeholders = columns.map(() => "?").join(",");
      let sql = `INSERT INTO ${table} (${columns.join(",")}) VALUES (${placeholders})`;
      if (conflict.length) {
        if (prefer.includes("ignore-duplicates")) sql += " ON CONFLICT DO NOTHING";
        else sql += ` ON CONFLICT (${conflict.join(",")}) DO UPDATE SET ${columns.filter(column => !conflict.includes(column)).map(column => `${column}=excluded.${column}`).join(",") || `${conflict[0]}=excluded.${conflict[0]}`}`;
      }
      await env.DB.prepare(sql).bind(...values).run();
    }
    if (prefer.includes("return=representation")) {
      const first = records[0] || {};
      const query = new URLSearchParams();
      for (const column of conflict.length ? conflict : Object.keys(first)) if (first[column] !== undefined) query.set(column, `eq.${String(first[column])}`);
      return await selectRows<T>(env, table, query) as T;
    }
    return [] as T;
  }

  if (method === "PATCH") {
    const entries = Object.entries(records[0] || {}).filter(([column]) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(column));
    if (entries.length) {
      const where = whereClause(params);
      const sql = `UPDATE ${table} SET ${entries.map(([column]) => `${column}=?`).join(",")}${where.sql}`;
      await env.DB.prepare(sql).bind(...entries.map(([column, value]) => encodeValue(column, value)), ...where.values).run();
    }
    if (prefer.includes("return=representation")) return await selectRows<T>(env, table, params) as T;
    return [] as T;
  }

  if (method === "DELETE") {
    const where = whereClause(params);
    await env.DB.prepare(`DELETE FROM ${table}${where.sql}`).bind(...where.values).run();
    return [] as T;
  }
  throw new Error(`Unsupported database method: ${method}`);
}
