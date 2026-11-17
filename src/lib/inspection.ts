import type { Delivery, Issue, Line, Receipt } from "./types.ts";

export function judge(line: Line): string[] {
  const labels: string[] = [];
  if (line.actual !== null && line.actual < line.expected) labels.push("不足");
  if (line.actual !== null && line.actual > line.expected) labels.push("過剰");
  if (line.condition !== "良好") labels.push(line.condition);
  return labels;
}

export function progress(delivery: Delivery) {
  return {
    total: delivery.lines.length,
    checked: delivery.lines.filter((line) => line.checked && line.actual !== null).length,
    issues: delivery.lines.filter((line) => judge(line).length > 0).length,
  };
}

export function status(delivery: Delivery) {
  if (delivery.receipt) {
    return delivery.receipt.result === "受取拒否" ? "受取拒否" : "検収済み";
  }
  if (!delivery.arrived) return "未着";
  if (progress(delivery).issues) return "差異あり";
  return "検品中";
}

export function issues(
  deliveries: Delivery[],
  filters = { supplier: "", policy: "", resolution: "" },
): Issue[] {
  return deliveries
    .flatMap((delivery) =>
      delivery.lines.filter((line) => judge(line).length > 0).map((line) => ({ delivery, line })),
    )
    .filter(
      ({ delivery, line }) =>
        (!filters.supplier || delivery.supplier === filters.supplier) &&
        (!filters.policy || line.policy === filters.policy) &&
        (!filters.resolution || line.resolution === filters.resolution),
    )
    .sort((a, b) => Number(a.line.resolution === "解決") - Number(b.line.resolution === "解決"));
}

export function canAccept(delivery: Delivery, result: Receipt["result"]): string {
  if (delivery.receipt) return "この納品は検収済みです。";
  if (!delivery.arrived) return "到着を記録してください。";
  const p = progress(delivery);
  if (!p.total || p.checked !== p.total) return "すべての明細を確認してください。";
  if (result === "すべて良好で検収" && p.issues)
    return "不備があるため条件付き検収を選択してください。";
  if (result === "差異ありで条件付き検収" && !p.issues)
    return "不備がありません。すべて良好で検収を選択してください。";
  return "";
}

export function normalizeRecord(delivery: Delivery): string {
  const r = delivery.receipt;
  return JSON.stringify({
    id: delivery.id,
    number: delivery.number,
    supplier: delivery.supplier,
    order: delivery.order,
    scheduled: delivery.scheduled,
    arrived: delivery.arrived,
    location: delivery.location,
    person: delivery.person,
    memo: delivery.memo,
    lines: delivery.lines.map((l) => ({
      id: l.id,
      name: l.name,
      code: l.code,
      unit: l.unit,
      expected: l.expected,
      actual: l.actual,
      checked: l.checked,
      condition: l.condition,
      comment: l.comment,
      photos: [...l.photos],
      policy: l.policy,
    })),
    receipt: r
      ? { name: r.name, at: r.at, result: r.result, comment: r.comment, signature: r.signature }
      : null,
    history: delivery.history,
  });
}

export async function sha256(input: string | ArrayBuffer): Promise<string> {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, "0")).join("");
}

export function cancelReceipt(delivery: Delivery, reason: string, at: string): Delivery {
  if (!reason.trim()) throw new Error("取り消し理由を入力してください。");
  if (!delivery.receipt) throw new Error("検収記録がありません。");
  return {
    ...delivery,
    receipt: null,
    lines: delivery.lines.map((line) => ({ ...line, checked: false })),
    history: [...delivery.history, { reason: reason.trim(), at, receipt: { ...delivery.receipt } }],
  };
}

export function allowedUpdate(previous: Delivery, next: Delivery): boolean {
  if (!previous.receipt) return true;
  if (next.receipt)
    return (
      normalizeRecord(previous) === normalizeRecord(next) &&
      previous.receipt.hash === next.receipt.hash
    );
  const entry = next.history.at(-1);
  if (!entry?.reason.trim() || next.history.length !== previous.history.length + 1) return false;
  const expected = cancelReceipt(previous, entry.reason, entry.at);
  return JSON.stringify(expected) === JSON.stringify(next);
}

export function newLine(id: string): Line {
  return {
    id,
    name: "",
    code: "",
    unit: "個",
    expected: 1,
    actual: null,
    checked: false,
    condition: "良好",
    comment: "",
    photos: [],
    policy: "確認中",
    resolution: "未対応",
  };
}

export function duplicateDelivery(delivery: Delivery, id: string, today: string): Delivery {
  return {
    ...delivery,
    id,
    number: "",
    scheduled: today,
    arrived: "",
    receipt: null,
    history: [],
    memo: "",
    lines: delivery.lines.map((l, i) => ({
      ...newLine(`${id}-${i}`),
      name: l.name,
      code: l.code,
      unit: l.unit,
      expected: l.expected,
    })),
  };
}
