import { conditions, policies, resolutions, results } from "./types.ts";
import type { Store } from "./types.ts";

export const STORAGE_KEY = "dic:v1";
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object";
const str = (v: unknown): v is string => typeof v === "string";
const count = (v: unknown) => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const timestamp = (v: unknown) =>
  str(v) && /^\d{4}-\d\d-\d\dT/.test(v) && Number.isFinite(Date.parse(v));
const date = (v: unknown) =>
  str(v) &&
  /^\d{4}-\d\d-\d\d$/.test(v) &&
  Number.isFinite(Date.parse(v)) &&
  new Date(v).toISOString().slice(0, 10) === v;
const strings = (v: Record<string, unknown>, keys: string[]) => keys.every((k) => str(v[k]));
const oneOf = (v: unknown, values: readonly string[]) => str(v) && values.includes(v);

function receipt(v: unknown): boolean {
  return (
    obj(v) &&
    strings(v, ["name", "comment", "signature", "hash"]) &&
    timestamp(v.at) &&
    oneOf(v.result, results) &&
    /^data:image\/png;base64,/.test(v.signature as string) &&
    /^[a-f0-9]{64}$/.test(v.hash as string) &&
    !!(v.name as string).trim()
  );
}

export function validateStore(value: unknown): value is Store {
  if (!obj(value) || value.version !== 1 || !Array.isArray(value.deliveries)) return false;
  const ids = new Set<string>();
  return value.deliveries.every((d: unknown) => {
    if (
      !obj(d) ||
      !strings(d, ["id", "number", "supplier", "order", "arrived", "location", "person", "memo"]) ||
      !date(d.scheduled) ||
      (d.arrived !== "" && !timestamp(d.arrived)) ||
      !Array.isArray(d.lines) ||
      !d.lines.length ||
      !Array.isArray(d.history) ||
      !d.id ||
      ids.has(d.id as string) ||
      !d.number ||
      !d.supplier
    )
      return false;
    ids.add(d.id as string);
    const lineIds = new Set<string>();
    if (
      !d.lines.every((l: unknown) => {
        if (
          !obj(l) ||
          !strings(l, ["id", "name", "code", "unit", "comment"]) ||
          !l.id ||
          !l.name ||
          !l.unit ||
          lineIds.has(l.id as string) ||
          !count(l.expected) ||
          (l.actual !== null && !count(l.actual)) ||
          typeof l.checked !== "boolean" ||
          (l.checked && l.actual === null) ||
          !oneOf(l.condition, conditions) ||
          !oneOf(l.policy, policies) ||
          !oneOf(l.resolution, resolutions) ||
          !Array.isArray(l.photos) ||
          l.photos.length > 3 ||
          !l.photos.every(str) ||
          new Set(l.photos).size !== l.photos.length
        )
          return false;
        lineIds.add(l.id as string);
        return true;
      })
    )
      return false;
    if (d.receipt !== null && !receipt(d.receipt)) return false;
    return d.history.every(
      (h: unknown) =>
        obj(h) && str(h.reason) && !!h.reason.trim() && timestamp(h.at) && receipt(h.receipt),
    );
  });
}

export function parseStore(raw: string): Store | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return validateStore(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveStore(store: Store): void {
  if (!validateStore(store)) throw new Error("保存内容が不正です。入力を確認してください。");
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}
