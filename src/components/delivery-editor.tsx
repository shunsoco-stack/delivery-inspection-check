"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fromJapanInput, toJapanInput } from "@/lib/dates";
import { newLine } from "@/lib/inspection";
import type { Delivery, Line } from "@/lib/types";
import { useStore } from "./store-provider";

export function DeliveryEditor({ initial, onClose }: { initial?: Delivery; onClose: () => void }) {
  const { data, today, update, notify } = useStore();
  const router = useRouter();
  const [draft, setDraft] = useState<Delivery>(
    () =>
      initial ?? {
        id: crypto.randomUUID(),
        number: "",
        supplier: "",
        order: "",
        scheduled: today,
        arrived: "",
        location: "倉庫・受入カウンター",
        person: "",
        memo: "",
        receipt: null,
        history: [],
        lines: [newLine(crypto.randomUUID())],
      },
  );
  const [error, setError] = useState("");
  const suppliers = [...new Set(data?.deliveries.map((d) => d.supplier))];
  const items = [
    ...new Map(data?.deliveries.flatMap((d) => d.lines).map((l) => [l.name, l])).values(),
  ];
  function field(key: keyof Delivery, value: string) {
    setDraft({ ...draft, [key]: value });
  }
  function lineField(id: string, patch: Partial<Line>) {
    setDraft({
      ...draft,
      lines: draft.lines.map((l) => (l.id === id ? { ...l, ...patch, checked: false } : l)),
    });
  }
  function move(index: number, direction: number) {
    const lines = [...draft.lines];
    [lines[index], lines[index + direction]] = [lines[index + direction], lines[index]];
    setDraft({ ...draft, lines });
  }
  function save(event: React.FormEvent) {
    event.preventDefault();
    if (draft.arrived && Date.parse(draft.arrived) > Date.now()) {
      setError("到着日時は現在以前の日本時間を入力してください。");
      return;
    }
    if (
      !draft.number.trim() ||
      !draft.supplier.trim() ||
      draft.lines.some((l) => !l.name.trim() || !l.unit.trim())
    ) {
      setError("納品書番号・納品元・品名・単位を入力してください。");
      return;
    }
    if (update(draft)) {
      notify("納品を保存しました。");
      onClose();
      router.push(`/deliveries/${draft.id}`);
    }
  }
  return (
    <div className="modal-backdrop">
      <section
        className="modal editor-modal"
        role="dialog"
        aria-modal="true"
        aria-label="納品の登録・編集"
      >
        <div className="section-header">
          <div>
            <p className="eyebrow">DELIVERY DETAILS</p>
            <h2>{initial?.number ? "納品を編集" : "納品を登録"}</h2>
          </div>
          <button onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>
        <form onSubmit={save} className="editor-form">
          <div className="form-grid">
            <label>
              納品書番号
              <input
                required
                value={draft.number}
                onChange={(e) => field("number", e.target.value)}
                placeholder="例：DN-1043"
              />
            </label>
            <label>
              納品元
              <input
                required
                list="supplier-options"
                value={draft.supplier}
                onChange={(e) => field("supplier", e.target.value)}
                placeholder="納品元を入力・選択"
              />
            </label>
            <label>
              発注番号（参照用）
              <input value={draft.order} onChange={(e) => field("order", e.target.value)} />
            </label>
            <label>
              到着予定日
              <input
                type="date"
                required
                value={draft.scheduled}
                onChange={(e) => field("scheduled", e.target.value)}
              />
            </label>
            <label>
              到着日時（日本時間）
              <input
                type="datetime-local"
                value={toJapanInput(draft.arrived)}
                onChange={(e) => field("arrived", fromJapanInput(e.target.value))}
              />
            </label>
            <label>
              受入場所
              <input
                required
                value={draft.location}
                onChange={(e) => field("location", e.target.value)}
              />
            </label>
            <label>
              担当者
              <input
                required
                value={draft.person}
                onChange={(e) => field("person", e.target.value)}
              />
            </label>
            <label>
              メモ
              <input value={draft.memo} onChange={(e) => field("memo", e.target.value)} />
            </label>
          </div>
          <datalist id="supplier-options">
            {suppliers.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <datalist id="item-options">
            {items.map((l) => (
              <option key={l.name} value={l.name} />
            ))}
          </datalist>
          <h3>
            納品書の明細 <small>数量のみ・金額は扱いません</small>
          </h3>
          {draft.lines.map((l, index) => (
            <div className="edit-line" key={l.id}>
              <div className="edit-line-title">
                <strong>明細 {index + 1}</strong>
                <div className="button-group">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={`明細${index + 1}を上へ`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === draft.lines.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={`明細${index + 1}を下へ`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    disabled={draft.lines.length === 1}
                    onClick={() =>
                      setDraft({ ...draft, lines: draft.lines.filter((line) => line.id !== l.id) })
                    }
                  >
                    削除
                  </button>
                </div>
              </div>
              <label>
                品名
                <input
                  required
                  list="item-options"
                  value={l.name}
                  onChange={(e) => {
                    const item = items.find((v) => v.name === e.target.value);
                    lineField(l.id, {
                      name: e.target.value,
                      ...(item ? { code: item.code, unit: item.unit } : {}),
                    });
                  }}
                />
              </label>
              <div className="form-grid thirds">
                <label>
                  品番
                  <input
                    value={l.code}
                    onChange={(e) => lineField(l.id, { code: e.target.value })}
                  />
                </label>
                <label>
                  単位
                  <input
                    required
                    value={l.unit}
                    onChange={(e) => lineField(l.id, { unit: e.target.value })}
                  />
                </label>
                <label>
                  納品書数量
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={l.expected}
                    onChange={(e) => lineField(l.id, { expected: Number(e.target.value) })}
                  />
                </label>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="wide"
            onClick={() =>
              setDraft({ ...draft, lines: [...draft.lines, newLine(crypto.randomUUID())] })
            }
          >
            ＋ 明細を追加
          </button>
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              キャンセル
            </button>
            <button className="primary" type="submit">
              納品を保存
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
