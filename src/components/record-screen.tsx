"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cancelReceipt, judge, normalizeRecord, sha256 } from "@/lib/inspection";
import { formatTime } from "@/lib/dates";
import { getPhoto } from "@/lib/photos";
import { resolutions } from "@/lib/types";
import type { Delivery, Line } from "@/lib/types";
import { useStore } from "./store-provider";
import { Badge, Loading, Missing, PageHeading } from "./common";
import { PhotoGallery } from "./photo-gallery";
import { CancellationHistory } from "./cancellation-history";

export function RecordScreen() {
  const { id } = useParams<{ id: string }>();
  const { data } = useStore();
  if (!data) return <Loading />;
  const d = data.deliveries.find((v) => v.id === id);
  if (!d) return <Missing />;
  if (!d.receipt)
    return (
      <div className="empty">
        まだ検収記録がありません。
        <Link className="button" href={`/deliveries/${id}`}>
          検品へ戻る
        </Link>
        <CancellationHistory delivery={d} />
      </div>
    );
  return <Record delivery={d} />;
}

function Record({ delivery: d }: { delivery: Delivery }) {
  const { update, notify } = useStore();
  const router = useRouter();
  const [integrity, setIntegrity] = useState("記録を検証中…");
  const [valid, setValid] = useState<boolean | null>(null);
  const [reason, setReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const input = normalizeRecord(d);
  const hash = d.receipt!.hash;
  useEffect(() => {
    let live = true;
    async function verify() {
      let matches = (await sha256(input)) === hash;
      const parsed = JSON.parse(input) as { lines: { photos: string[] }[] };
      let missing = false;
      for (const id of parsed.lines.flatMap((l) => l.photos)) {
        const blob = await getPhoto(id);
        if (!blob) missing = true;
        else if ((await sha256(await blob.arrayBuffer())) !== id) matches = false;
      }
      if (live) {
        setValid(matches && !missing);
        setIntegrity(
          !matches
            ? "内容が変更されています"
            : missing
              ? "写真が削除されています。証拠の完全性を確認できません。"
              : "記録の指紋が一致しました",
        );
      }
    }
    void verify().catch(() => {
      if (live) {
        setValid(false);
        setIntegrity("記録を検証できませんでした。");
      }
    });
    return () => {
      live = false;
    };
  }, [input, hash]);
  function cancel() {
    if (!reason.trim()) return;
    const next = cancelReceipt(d, reason, new Date().toISOString());
    if (update(next)) {
      notify("取り消し理由を履歴に保存しました。すべての行を再確認してください。");
      router.push(`/deliveries/${d.id}`);
    }
  }
  const r = d.receipt!;
  return (
    <>
      <div className="no-print">
        <Link className="back-link" href="/deliveries?status=検収済み">
          ← 検収済み一覧
        </Link>
        <PageHeading
          eyebrow="INSPECTION RECORD"
          title="検収記録"
          description="サイン付きの確定記録。明細・写真・サインはロックされています。"
        >
          <button onClick={() => window.print()}>印刷・PDF保存</button>
          <Link className="button" href={`/deliveries/${d.id}`}>
            納品の詳細
          </Link>
        </PageHeading>
      </div>
      <article className="record-sheet">
        <div className="record-heading">
          <div>
            <p className="eyebrow">RECEIVING & INSPECTION RECORD</p>
            <h1>納品・検収記録</h1>
            <p>{d.number}</p>
          </div>
          <div className="record-seal">
            ✓<span>{r.result === "受取拒否" ? "受取拒否" : "検収済み"}</span>
          </div>
        </div>
        <p className="record-demo">デモ用の架空データです</p>
        <h2>{d.supplier}</h2>
        <dl className="record-meta">
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
          <div>
            <dt>メモ</dt>
            <dd>{d.memo || "—"}</dd>
          </div>
        </dl>
        <h3>明細と照合結果</h3>
        <div className="record-lines">
          {d.lines.map((l, i) => (
            <section className="record-line" key={l.id}>
              <div className="record-line-heading">
                <strong>
                  {i + 1}. {l.name}
                </strong>
                <span>{l.code}</span>
              </div>
              <div className="record-quantities">
                <span>
                  納品書：
                  <b>
                    {l.expected} {l.unit}
                  </b>
                </span>
                <span>
                  実数：
                  <b>
                    {l.actual} {l.unit}
                  </b>
                </span>
                <Badge value={l.condition} />
                {judge(l)
                  .filter((v) => v !== l.condition)
                  .map((v) => (
                    <Badge key={v} value={v} />
                  ))}
              </div>
              {l.comment && <p>{l.comment}</p>}
              {judge(l).length > 0 && (
                <div className="record-issue">
                  <span>対応方針：{l.policy}</span>
                  <label className="no-print">
                    対応状況
                    <select
                      value={l.resolution}
                      onChange={(e) =>
                        update({
                          ...d,
                          lines: d.lines.map((v) =>
                            v.id === l.id
                              ? { ...v, resolution: e.target.value as Line["resolution"] }
                              : v,
                          ),
                        })
                      }
                    >
                      {resolutions.map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                  <span className="print-only">対応状況：{l.resolution}</span>
                </div>
              )}
              <PhotoGallery ids={l.photos} locked />
            </section>
          ))}
        </div>
        <div className="record-signoff">
          <div>
            <h3>{r.result}</h3>
            <dl>
              <dt>検収者</dt>
              <dd>{r.name}</dd>
              <dt>検収日時（日本時間）</dt>
              <dd>{formatTime(r.at)}</dd>
            </dl>
            <p>{r.comment || "コメントなし"}</p>
          </div>
          <div className="signed-image">
            <small>検収者サイン</small>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={r.signature} alt="検収者の手書きサイン" />
          </div>
        </div>
        <div className={`fingerprint ${valid === false ? "invalid" : ""}`} role="status">
          <strong>{integrity}</strong>
          <span>
            記録の指紋（SHA-256）：<code>{hash.slice(0, 20)}</code>
          </span>
          <details>
            <summary>指紋をすべて表示</summary>
            <code>{hash}</code>
          </details>
          <small>
            簡易な改ざん検知のデモです。法的な電子署名ではありません。対応状況は指紋の対象外です。
          </small>
        </div>
        <CancellationHistory delivery={d} />
      </article>
      <section className="panel cancellation no-print">
        <h3>内容を変更する必要がある場合</h3>
        <p>取り消し理由と旧検収情報を履歴に残し、再検品します。</p>
        {cancelling ? (
          <>
            <label>
              取り消し理由（必須）
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
            <div className="button-group">
              <button onClick={() => setCancelling(false)}>戻る</button>
              <button className="danger" disabled={!reason.trim()} onClick={cancel}>
                取り消して再検品
              </button>
            </div>
          </>
        ) : (
          <button onClick={() => setCancelling(true)}>検収を取り消して再検品</button>
        )}
      </section>
    </>
  );
}
