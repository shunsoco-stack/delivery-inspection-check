"use client";

import { useEffect, useState } from "react";
import { statuses } from "@/lib/types";
import { status } from "@/lib/inspection";
import { downloadCsv } from "@/lib/csv";
import { useStore } from "./store-provider";
import { DeliveryList, Loading, PageHeading } from "./common";
import { DeliveryEditor } from "./delivery-editor";

export function DeliveriesScreen() {
  const { data } = useStore();
  const [selected, setSelected] = useState("");
  const [supplier, setSupplier] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    const readLocation = () => {
      const params = new URLSearchParams(window.location.search);
      setSelected(params.get("status") ?? "");
      setEditing(params.has("new"));
    };
    queueMicrotask(readLocation);
    window.addEventListener("popstate", readLocation);
    return () => window.removeEventListener("popstate", readLocation);
  }, []);
  if (!data) return <Loading />;
  const filtered = data.deliveries.filter(
    (d) =>
      (!selected || status(d) === selected) &&
      (!supplier || d.supplier === supplier) &&
      (!from || d.scheduled >= from) &&
      (!to || d.scheduled <= to) &&
      `${d.number} ${d.supplier} ${d.order}`.includes(query),
  );
  return (
    <>
      <PageHeading
        eyebrow="DELIVERIES"
        title="納品一覧"
        description="納品書ごとに、受け入れから検収までを管理します。"
      >
        <button onClick={() => downloadCsv(filtered)} disabled={!filtered.some((d) => d.receipt)}>
          ↓ 検収記録 CSV
        </button>
        <button className="primary" onClick={() => setEditing(true)}>
          ＋ 納品を登録
        </button>
      </PageHeading>
      <section className="panel">
        <div className="filters">
          <label>
            検索
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="納品書番号・納品元・発注番号"
            />
          </label>
          <label>
            状態
            <select value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">すべての状態</option>
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            納品元
            <select value={supplier} onChange={(e) => setSupplier(e.target.value)}>
              <option value="">すべての納品元</option>
              {[...new Set(data.deliveries.map((d) => d.supplier))].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            予定日・開始
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            予定日・終了
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <div className="section-header">
          <h2>
            {selected || "すべての納品"} <span className="count-chip">{filtered.length}</span>
          </h2>
          <button
            className="text-button"
            onClick={() => {
              setSelected("");
              setSupplier("");
              setFrom("");
              setTo("");
              setQuery("");
            }}
          >
            絞り込みを解除
          </button>
        </div>
        <DeliveryList deliveries={filtered} />
      </section>
      <p className="muted hint">
        CSV は表示中の確定記録を明細単位で出力します。写真とサインは枚数のみ含まれます。
      </p>
      {editing && <DeliveryEditor onClose={() => setEditing(false)} />}
    </>
  );
}
