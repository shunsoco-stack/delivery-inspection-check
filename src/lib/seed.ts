import { before, relativeDate } from "./dates.ts";
import { newLine } from "./inspection.ts";
import type { Delivery, Line, Store } from "./types.ts";

type Item = [string, string, string, number];
const paper: Item = ["A4コピー用紙 500枚", "P-401", "冊", 10];
const box: Item = ["段ボール箱 60サイズ", "B-060", "枚", 30];
const gloves: Item = ["業務用手袋 Mサイズ", "G-200", "箱", 6];
const tape: Item = ["梱包テープ", "T-050", "巻", 12];
const towel: Item = ["ペーパータオル", "P-120", "袋", 8];
const bag: Item = ["保存用ポリ袋", "F-210", "箱", 5];
const rice: Item = ["精米 5kg", "F-105", "袋", 4];
const tea: Item = ["業務用茶葉", "F-110", "袋", 3];
const pen: Item = ["油性ペン 黒", "S-012", "本", 12];
const file: Item = ["書類ファイル A4", "S-020", "冊", 20];
const wrap: Item = ["緩衝シート", "B-300", "巻", 3];
const midori = "みどり梱包資材（架空）";
const hikari = "ひかり食品卸（架空）";
const aonagi = "青凪オフィス用品（架空）";

function make(
  now: Date,
  id: string,
  supplier: string,
  days: number,
  arrivalMinutes: number | null,
  items: Item[],
  checked: number,
): Delivery {
  const lines = items.map(([name, code, unit, expected], i): Line => ({
    ...newLine(`${id}-${i + 1}`),
    name,
    code,
    unit,
    expected,
    actual: i < checked ? expected : null,
    checked: i < checked,
  }));
  return {
    id,
    number: `DN-${id}`,
    supplier,
    order: `PO-${id}-A`,
    scheduled: relativeDate(now, days),
    arrived: arrivalMinutes === null ? "" : before(now, arrivalMinutes),
    location: supplier === hikari ? "店舗・搬入口" : "倉庫・受入カウンター",
    person: "受入担当（架空）",
    memo: "納品書と現物を照合してください。",
    lines,
    receipt: null,
    history: [],
  };
}

function finish(d: Delivery, now: Date, minutes: number, refused = false): Delivery {
  d.receipt = {
    name: "検収担当（架空）",
    at: before(now, minutes),
    result: refused
      ? "受取拒否"
      : d.lines.some((l) => l.condition !== "良好")
        ? "差異ありで条件付き検収"
        : "すべて良好で検収",
    comment: refused ? "濡れのため受け取りを見送りました。" : "明細と現物を確認しました。",
    signature: "seed-signature",
    hash: "",
  };
  return d;
}

// 各納品の明細・状況は個別に設定。日時だけを起動時点から相対生成する。
export function generateSeed(now: Date): Store {
  const a = make(now, "1041", midori, 0, null, [box, tape, wrap, gloves], 0);
  const b = make(now, "1042", hikari, 1, null, [rice, tea, bag], 0);
  const c = make(now, "1039", aonagi, 0, 35, [paper, pen, file, towel], 2);
  const d = make(now, "1040", midori, 0, 20, [box, tape, gloves], 1);
  const e = make(now, "1037", midori, 0, 90, [box, tape, wrap, gloves], 4);
  Object.assign(e.lines[0], {
    actual: 28,
    condition: "破損",
    comment: "角のへこみが2枚。数量も2枚不足。",
    photos: ["sample-dent"],
    policy: "再納品依頼",
    resolution: "連絡済み",
  });
  const f = make(now, "1038", hikari, 0, 60, [rice, tea, bag, towel], 4);
  Object.assign(f.lines[1], {
    condition: "期限・ロット違い",
    comment: "納品書とロット表示が異なるため確認。",
    photos: ["sample-lot"],
    policy: "確認中",
  });
  const g = finish(make(now, "1034", aonagi, -1, 1500, [paper, file, pen], 3), now, 1480);
  const h = make(now, "1035", midori, -1, 1460, [box, tape, wrap, gloves, towel], 5);
  Object.assign(h.lines[0], {
    condition: "破損",
    comment: "外箱のみへこみ。中身の使用に支障なし。",
    photos: ["sample-minor"],
    policy: "受け入れ（そのまま使用）",
    resolution: "解決",
  });
  finish(h, now, 1440);
  const i = finish(make(now, "1032", hikari, -2, 2900, [rice, tea, bag], 3), now, 2880);
  const j = make(now, "1033", midori, -2, 2880, [box, tape, wrap], 3);
  Object.assign(j.lines[0], {
    condition: "汚れ・濡れ",
    comment: "段ボール全体に水濡れあり。",
    photos: ["sample-wet"],
    policy: "返品",
    resolution: "連絡済み",
  });
  Object.assign(j.lines[2], { actual: 2, comment: "緩衝シートが1巻不足。", policy: "返品" });
  finish(j, now, 2860, true);
  return { version: 1, deliveries: [a, b, c, d, e, f, g, h, i, j] };
}
