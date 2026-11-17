import test from "node:test";
import assert from "node:assert/strict";
import { generateSeed } from "../src/lib/seed.ts";
import {
  japanDate,
  relativeDate,
  before,
  formatTime,
  toJapanInput,
  fromJapanInput,
} from "../src/lib/dates.ts";
import {
  judge,
  progress,
  status,
  issues,
  canAccept,
  normalizeRecord,
  sha256,
  cancelReceipt,
  newLine,
  duplicateDelivery,
  allowedUpdate,
} from "../src/lib/inspection.ts";
import { generateCsv, csvCell } from "../src/lib/csv.ts";
import { parseStore, validateStore } from "../src/lib/storage.ts";

const now = new Date("2026-06-10T09:00:00.000Z");
const seed = () => generateSeed(now);
test("ロック後は対応状況のみ変更可能", () => {
  const d = seed().deliveries[7];
  const next = structuredClone(d);
  next.lines[0].resolution = "連絡済み";
  assert.equal(allowedUpdate(d, next), true);
  next.lines[0].actual = 999;
  assert.equal(allowedUpdate(d, next), false);
});
test("ロック解除は正しい取り消し履歴を必須とする", () => {
  const d = seed().deliveries[6];
  assert.equal(allowedUpdate(d, { ...d, receipt: null }), false);
  assert.equal(allowedUpdate(d, cancelReceipt(d, "再確認", now.toISOString())), true);
});
async function persisted() {
  const data = seed();
  for (const d of data.deliveries) {
    if (d.receipt) {
      d.receipt.signature = "data:image/png;base64,c2FtcGxl";
      d.receipt.hash = await sha256(normalizeRecord(d));
    }
  }
  return data;
}

test("数量一致・良好には不備がない", () => {
  assert.deepEqual(judge({ ...newLine("a"), expected: 5, actual: 5 }), []);
});
test("不足を判定", () =>
  assert.deepEqual(judge({ ...newLine("a"), expected: 5, actual: 4 }), ["不足"]));
test("過剰を判定", () =>
  assert.deepEqual(judge({ ...newLine("a"), expected: 5, actual: 6 }), ["過剰"]));
test("未入力は数量不備としない", () => assert.deepEqual(judge(newLine("a")), []));
test("数量と状態の複合不備", () =>
  assert.deepEqual(judge({ ...newLine("a"), actual: 0, condition: "破損" }), ["不足", "破損"]));
for (const condition of ["破損", "汚れ・濡れ", "品違い", "期限・ロット違い"]) {
  test(`状態不良：${condition}`, () =>
    assert.deepEqual(judge({ ...newLine("a"), condition }), [condition]));
}
test("進捗は確認済み行を集計", () =>
  assert.deepEqual(progress(seed().deliveries[2]), { total: 4, checked: 2, issues: 0 }));
test("不備は5行、解決済みを最後に表示", () => {
  const rows = issues(seed().deliveries);
  assert.equal(rows.length, 5);
  assert.equal(rows.at(-1).line.resolution, "解決");
});
test("納品元・方針・状況の組み合わせで絞り込み", () => {
  const rows = issues(seed().deliveries, {
    supplier: "みどり梱包資材（架空）",
    policy: "再納品依頼",
    resolution: "連絡済み",
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].delivery.id, "1037");
});
test("一致しない絞り込みは空", () =>
  assert.equal(
    issues(seed().deliveries, { supplier: "なし", policy: "", resolution: "" }).length,
    0,
  ));
test("未着は検収不可", () =>
  assert.match(canAccept(seed().deliveries[0], "すべて良好で検収"), /到着/));
test("未確認行は検収不可", () =>
  assert.match(canAccept(seed().deliveries[2], "すべて良好で検収"), /すべての明細/));
test("不備ありの良好検収は不可", () =>
  assert.match(canAccept(seed().deliveries[4], "すべて良好で検収"), /条件付き/));
test("全確認済みの条件付き検収が可能", () =>
  assert.equal(canAccept(seed().deliveries[4], "差異ありで条件付き検収"), ""));
test("全確認済みなら受取拒否が可能", () =>
  assert.equal(canAccept(seed().deliveries[4], "受取拒否"), ""));
test("確定済みの再確定は不可", () =>
  assert.match(canAccept(seed().deliveries[6], "すべて良好で検収"), /検収済み/));
test("不備のない条件付き検収は不可", () => {
  const d = seed().deliveries[6];
  d.receipt = null;
  assert.match(canAccept(d, "差異ありで条件付き検収"), /不備がありません/);
  assert.equal(canAccept(d, "すべて良好で検収"), "");
});
test("正規化の順序はオブジェクト挿入順に依存しない", () => {
  const d = seed().deliveries[6];
  assert.equal(
    normalizeRecord(d),
    normalizeRecord(Object.fromEntries(Object.entries(d).reverse())),
  );
});
test("対応状況はハッシュ対象外", () => {
  const d = seed().deliveries[7];
  const original = normalizeRecord(d);
  d.lines[0].resolution = "未対応";
  assert.equal(normalizeRecord(d), original);
});
test("明細を書き換えるとハッシュが変わる", async () => {
  const d = seed().deliveries[6];
  const original = await sha256(normalizeRecord(d));
  d.lines[0].actual = 99;
  assert.notEqual(await sha256(normalizeRecord(d)), original);
});
test("サイン・結果・写真参照はハッシュ対象", async () => {
  for (const alter of [
    (d) => {
      d.receipt.signature = "changed";
    },
    (d) => {
      d.receipt.result = "受取拒否";
    },
    (d) => {
      d.lines[0].photos = ["changed"];
    },
  ]) {
    const d = seed().deliveries[6];
    const original = normalizeRecord(d);
    alter(d);
    assert.notEqual(await sha256(normalizeRecord(d)), await sha256(original));
  }
});
test("SHA-256の既知値", async () =>
  assert.equal(
    await sha256("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  ));
test("空の取り消し理由を拒否", () =>
  assert.throws(() => cancelReceipt(seed().deliveries[6], " ", now.toISOString()), /理由/));
test("未検収の取り消しを拒否", () =>
  assert.throws(
    () => cancelReceipt(seed().deliveries[2], "再確認", now.toISOString()),
    /記録がありません/,
  ));
test("取り消しは旧記録と理由を保持し全行を未確認に戻す", () => {
  const d = seed().deliveries[6];
  const next = cancelReceipt(d, " 再確認 ", now.toISOString());
  assert.equal(next.receipt, null);
  assert.equal(next.history[0].reason, "再確認");
  assert.deepEqual(next.history[0].receipt, d.receipt);
  assert.equal(progress(next).checked, 0);
  assert.ok(d.receipt);
});
test("前回の明細から作成すると検品・写真・サインを引き継がない", () => {
  const original = seed().deliveries[7];
  const copy = duplicateDelivery(original, "new", "2026-06-10");
  assert.equal(copy.number, "");
  assert.equal(copy.receipt, null);
  assert.equal(copy.arrived, "");
  assert.equal(copy.lines[0].name, original.lines[0].name);
  assert.ok(copy.lines.every((l) => l.actual === null && !l.checked && !l.photos.length));
});
test("CSVはBOM付き・明細単位・確定済みだけ", () => {
  const csv = generateCsv(seed().deliveries);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.equal(csv.split("\r\n").length, 15);
  assert.ok(!csv.includes("seed-signature"));
  assert.ok(!csv.includes("sample-wet"));
});
test("CSVは改行・引用符を安全に囲む", () => assert.equal(csvCell('a,"b\nc'), '"a,""b\nc"'));
test("CSV式注入を抑制", () => assert.equal(csvCell("=1+1"), '"\'=1+1"'));
test("正しい保存データを受理", async () => assert.ok(validateStore(await persisted())));
test("JSON破損を検出", () => assert.equal(parseStore("{broken"), null));
test("バージョンの不一致を拒否", () =>
  assert.equal(validateStore({ version: 2, deliveries: [] }), false));
test("負数・小数・重複ID・不正状態・写真過多を拒否", async () => {
  for (const alter of [
    (d) => {
      d.deliveries[0].lines[0].expected = -1;
    },
    (d) => {
      d.deliveries[0].lines[0].actual = 1.2;
    },
    (d) => {
      d.deliveries[1].id = d.deliveries[0].id;
    },
    (d) => {
      d.deliveries[0].lines[0].condition = "invalid";
    },
    (d) => {
      d.deliveries[0].lines[0].photos = ["a", "b", "c", "d"];
    },
    (d) => {
      d.deliveries[0].scheduled = "2026-02-30";
    },
  ]) {
    const d = await persisted();
    alter(d);
    assert.equal(validateStore(d), false);
  }
});
test("保存・復元の往復が一致", async () => {
  const d = await persisted();
  assert.deepEqual(parseStore(JSON.stringify(d)), d);
});
test("日本時間の日付境界", () => assert.equal(japanDate("2026-06-10T15:01:00Z"), "2026-06-11"));
test("日本時間入力の往復", () =>
  assert.equal(
    fromJapanInput(toJapanInput("2026-06-10T15:01:00.000Z")),
    "2026-06-10T15:01:00.000Z",
  ));
test("月をまたぐ相対日付", () =>
  assert.equal(relativeDate(new Date("2026-01-31T16:00:00Z"), -1), "2026-01-31"));
test("過去時刻生成", () => assert.ok(Date.parse(before(now, 1)) < now.getTime()));
test("空の日時表示", () => assert.equal(formatTime(""), "未到着"));
for (const clock of [
  "2026-05-10T00:01:00+09:00",
  "2026-05-10T05:00:00+09:00",
  "2026-05-10T18:00:00+09:00",
  "2026-01-31T23:59:00+09:00",
  "2026-12-31T23:59:00+09:00",
  "2027-01-01T00:00:01+09:00",
]) {
  test(`シードの内訳・過去時刻・予定日：${clock}`, () => {
    const current = new Date(clock);
    const ds = generateSeed(current).deliveries;
    const counts = Object.fromEntries(
      ["未着", "検品中", "差異あり", "検収済み", "受取拒否"].map((s) => [
        s,
        ds.filter((d) => status(d) === s).length,
      ]),
    );
    assert.deepEqual(counts, { 未着: 2, 検品中: 2, 差異あり: 2, 検収済み: 3, 受取拒否: 1 });
    for (const d of ds) {
      assert.ok(d.lines.length >= 3 && d.lines.length <= 8);
      if (d.arrived) assert.ok(Date.parse(d.arrived) < current.getTime());
      if (d.receipt) {
        assert.ok(Date.parse(d.receipt.at) < current.getTime());
        assert.ok(Date.parse(d.receipt.at) >= Date.parse(d.arrived));
      }
    }
    assert.ok(ds.some((d) => d.scheduled === japanDate(current)));
    assert.ok(ds.some((d) => d.scheduled > japanDate(current)));
    assert.ok(issues(ds).filter((v) => v.line.photos.length > 0).length >= 3);
  });
}
