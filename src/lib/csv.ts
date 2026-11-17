import type { Delivery } from "./types.ts";
import { formatTime } from "./dates.ts";

export function csvCell(value: unknown): string {
  const raw = String(value ?? "");
  const safe = /^[=+\-@\t\r\n]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function generateCsv(deliveries: Delivery[]): string {
  const rows: unknown[][] = [
    [
      "納品書番号",
      "納品元",
      "発注番号",
      "品名",
      "品番",
      "単位",
      "納品書数量",
      "実数",
      "状態",
      "コメント",
      "対応方針",
      "対応状況",
      "写真枚数",
      "検収結果",
      "検収者",
      "検収日時（日本時間）",
      "サイン枚数",
    ],
  ];
  for (const d of deliveries.filter((item) => item.receipt)) {
    for (const l of d.lines)
      rows.push([
        d.number,
        d.supplier,
        d.order,
        l.name,
        l.code,
        l.unit,
        l.expected,
        l.actual,
        l.condition,
        l.comment,
        l.policy,
        l.resolution,
        l.photos.length,
        d.receipt!.result,
        d.receipt!.name,
        formatTime(d.receipt!.at),
        1,
      ]);
  }
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function downloadCsv(deliveries: Delivery[]) {
  const url = URL.createObjectURL(
    new Blob([generateCsv(deliveries)], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "検収記録.csv";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
