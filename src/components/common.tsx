"use client";

import Link from "next/link";
import { progress, status } from "@/lib/inspection";
import type { Delivery } from "@/lib/types";

export function Badge({ value }: { value: string }) {
  const tone =
    value === "検収済み" || value === "解決" || value === "良好"
      ? "green"
      : value === "差異あり" || value === "未対応" || value === "不足" || value === "過剰"
        ? "amber"
        : value === "受取拒否" || value === "破損"
          ? "red"
          : value === "検品中" || value === "連絡済み"
            ? "blue"
            : "gray";
  return (
    <span className={`badge ${tone}`}>
      <span className="badge-dot" />
      {value}
    </span>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}

export function Loading() {
  return (
    <div className="empty" role="status">
      端末の記録を読み込んでいます…
    </div>
  );
}

export function Missing() {
  return (
    <div className="empty">
      <h1>見つかりません</h1>
      <p>この納品は存在しないか、削除されています。</p>
      <Link className="button" href="/deliveries">
        納品一覧へ戻る
      </Link>
    </div>
  );
}

export function DeliveryList({
  deliveries,
  empty = "該当する納品はありません。",
}: {
  deliveries: Delivery[];
  empty?: string;
}) {
  if (!deliveries.length) return <div className="empty">{empty}</div>;
  return (
    <div className="delivery-list">
      <div className="list-columns">
        <span>納品元 / 納品書番号</span>
        <span>到着予定・受入場所</span>
        <span>検品の進捗</span>
        <span>状態</span>
        <span />
      </div>
      {deliveries.map((d) => {
        const p = progress(d);
        return (
          <Link
            className="delivery-row"
            key={d.id}
            href={`/deliveries/${d.id}${d.receipt ? "/record" : ""}`}
          >
            <div className="supplier-cell">
              <span className="package-icon">▣</span>
              <div>
                <strong>{d.supplier}</strong>
                <small>
                  {d.number} <span className="separator">·</span> {d.lines.length} 明細
                </small>
              </div>
            </div>
            <div className="arrival-cell">
              <span>{d.scheduled.replaceAll("-", "/")}</span>
              <small>{d.location}</small>
            </div>
            <div className="progress-cell">
              <span>
                {p.checked}
                <small> / {p.total} 行確認済み</small>
              </span>
              <div className="progress-track">
                <div style={{ width: `${(p.checked / p.total) * 100}%` }} />
              </div>
            </div>
            <div>
              <Badge value={status(d)} />
              {p.issues > 0 && <small className="issue-count">不備 {p.issues} 件</small>}
            </div>
            <span className="row-arrow">›</span>
          </Link>
        );
      })}
    </div>
  );
}
