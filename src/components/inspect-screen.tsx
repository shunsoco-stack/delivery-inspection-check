"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { duplicateDelivery, progress, status } from "@/lib/inspection";
import { formatTime } from "@/lib/dates";
import { prunePhotos } from "@/lib/photos";
import type { Delivery } from "@/lib/types";
import { useStore } from "./store-provider";
import { Badge, Loading, Missing, PageHeading } from "./common";
import { DeliveryEditor } from "./delivery-editor";
import { InspectionLine } from "./inspection-line";
import { CancellationHistory } from "./cancellation-history";

export function InspectScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, today, update, remove, notify } = useStore();
  const [editor, setEditor] = useState<Delivery | null>(null);
  if (!data) return <Loading />;
  const d = data.deliveries.find((item) => item.id === id);
  if (!d) return <Missing />;
  const p = progress(d);
  async function deleteDelivery() {
    if (!d || !data || !window.confirm("この納品と関連する写真を削除します。よろしいですか？"))
      return;
    if (remove(d.id)) {
      try {
        await prunePhotos(
          data.deliveries
            .filter((v) => v.id !== d.id)
            .flatMap((v) => v.lines.flatMap((l) => l.photos)),
        );
      } catch {
        notify("納品は削除しましたが、不要な写真の整理に失敗しました。");
      }
      router.push("/deliveries");
    }
  }
  return (
    <>
      <Link className="back-link" href="/deliveries">
        ← 納品一覧
      </Link>
      <PageHeading
        eyebrow={`INSPECTION / ${d.number}`}
        title={d.supplier}
        description="納品書と現物を、明細ごとに照合してください。"
      >
        <Badge value={status(d)} />
      </PageHeading>
      <div className="panel delivery-meta">
        <dl>
          <div>
            <dt>納品書番号</dt>
            <dd>{d.number}</dd>
          </div>
          <div>
            <dt>発注番号（参照）</dt>
            <dd>{d.order || "—"}</dd>
          </div>
          <div>
            <dt>到着予定日</dt>
            <dd>{d.scheduled}</dd>
          </div>
          <div>
            <dt>到着日時</dt>
            <dd>{formatTime(d.arrived)}</dd>
          </div>
          <div>
            <dt>受入場所</dt>
            <dd>{d.location}</dd>
          </div>
          <div>
            <dt>担当者</dt>
            <dd>{d.person}</dd>
          </div>
        </dl>
        {d.memo && <p className="memo">{d.memo}</p>}
        <div className="button-group">
          {!d.receipt && (
            <>
              <button onClick={() => setEditor(d)}>納品内容を編集</button>
              <button className="danger-text" onClick={() => void deleteDelivery()}>
                削除
              </button>
            </>
          )}
          <button onClick={() => setEditor(duplicateDelivery(d, crypto.randomUUID(), today))}>
            前回と同じ明細で作成
          </button>
        </div>
      </div>
      {d.receipt ? (
        <div className="notice">
          <strong>この納品は検収済みのためロックされています。</strong>
          <Link className="button primary" href={`/deliveries/${id}/record`}>
            検収記録を見る →
          </Link>
        </div>
      ) : (
        <>
          {!d.arrived && (
            <div className="notice">
              <span>未着の納品です。荷物が届いたら検品を開始してください。</span>
              <button
                className="primary"
                onClick={() => update({ ...d, arrived: new Date().toISOString() })}
              >
                到着を記録・検品開始
              </button>
            </div>
          )}
          <div className="inspection-progress">
            <div>
              <strong>
                {p.total} 行中 {p.checked} 行確認済み
              </strong>
              <span>不備 {p.issues} 件</span>
            </div>
            <div className="progress-track">
              <div style={{ width: `${(p.checked / p.total) * 100}%` }} />
            </div>
          </div>
          <div className="inspection-lines">
            {d.lines.map((l, index) => (
              <InspectionLine
                key={l.id}
                line={l}
                index={index}
                disabled={!d.arrived}
                onChange={(line) =>
                  update({ ...d, lines: d.lines.map((v) => (v.id === line.id ? line : v)) })
                }
              />
            ))}
          </div>
          <div className="sign-bar">
            <div>
              <strong>
                {p.checked === p.total
                  ? "すべての明細を確認しました"
                  : `あと ${p.total - p.checked} 行を確認してください`}
              </strong>
              <small>確認後は、検収者のサインで記録を確定します。</small>
            </div>
            {d.arrived && p.checked === p.total ? (
              <Link className="button primary" href={`/deliveries/${id}/sign`}>
                検収する →
              </Link>
            ) : (
              <button disabled>検収する →</button>
            )}
          </div>
        </>
      )}
      <CancellationHistory delivery={d} />
      {editor && <DeliveryEditor initial={editor} onClose={() => setEditor(null)} />}
    </>
  );
}
