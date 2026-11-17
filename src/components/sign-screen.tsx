"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { canAccept, normalizeRecord, progress, sha256 } from "@/lib/inspection";
import { formatTime } from "@/lib/dates";
import { results } from "@/lib/types";
import type { Delivery, Receipt } from "@/lib/types";
import { useStore } from "./store-provider";
import { Loading, Missing, PageHeading } from "./common";
import { SignaturePad } from "./signature-pad";

export function SignScreen() {
  const { id } = useParams<{ id: string }>();
  const { data, update, notify } = useStore();
  if (!data) return <Loading />;
  const d = data.deliveries.find((v) => v.id === id);
  if (!d) return <Missing />;
  if (d.receipt)
    return (
      <div className="empty">
        この納品は確定済みです。
        <Link className="button" href={`/deliveries/${id}/record`}>
          検収記録へ
        </Link>
      </div>
    );
  return <SignForm delivery={d} update={update} notify={notify} />;
}

function SignForm({
  delivery: d,
  update,
  notify,
}: {
  delivery: Delivery;
  update: (d: Delivery) => boolean;
  notify: (s: string) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [result, setResult] = useState<Receipt["result"]>(
    progress(d).issues ? "差異ありで条件付き検収" : "すべて良好で検収",
  );
  const [comment, setComment] = useState("");
  const [signature, setSignature] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const blocked = canAccept(d, result);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (blocked || !signature || !name.trim()) {
      setError(blocked || "検収者名とサインを入力してください。");
      return;
    }
    setBusy(true);
    try {
      const next = {
        ...d,
        receipt: {
          name: name.trim(),
          at: new Date().toISOString(),
          result,
          comment,
          signature,
          hash: "",
        },
      };
      next.receipt.hash = await sha256(normalizeRecord(next));
      if (update(next)) {
        notify("サイン付きの検収記録を確定しました。");
        router.push(`/deliveries/${d.id}/record`);
      }
    } catch {
      setError("記録の指紋を作成できません。HTTPSまたはlocalhostでご利用ください。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link href={`/deliveries/${d.id}`} className="back-link">
        ← 検品に戻る
      </Link>
      <PageHeading
        eyebrow="SIGN & COMPLETE"
        title="検収とサイン"
        description={`${d.number} / ${d.supplier}`}
      />
      <form className="panel sign-form" onSubmit={submit}>
        <div className="sign-summary">
          <span className="receipt-icon">✓</span>
          <div>
            <strong>
              {progress(d).checked} / {d.lines.length} 行確認済み・不備 {progress(d).issues} 件
            </strong>
            <p>到着：{formatTime(d.arrived)}</p>
          </div>
        </div>
        <div className="form-grid">
          <label>
            検収者名
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="検収した方の名前"
            />
          </label>
          <label>
            検収日時
            <input readOnly value="確定時の日本時間を自動記録" />
          </label>
        </div>
        <label>
          検収結果
          <select value={result} onChange={(e) => setResult(e.target.value as Receipt["result"])}>
            {results.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          全体コメント
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="条件付き検収の条件や、受取拒否の理由など"
          />
        </label>
        <div>
          <h3>
            検収者のサイン <span className="required">必須</span>
          </h3>
          <SignaturePad onChange={setSignature} />
        </div>
        <p className="notice">
          確定後は明細・写真・サインがロックされます。不備の対応状況は引き続き更新できます。
        </p>
        {(blocked || error) && (
          <p className="notice error" role="alert">
            {blocked || error}
          </p>
        )}
        <button
          className="primary wide"
          type="submit"
          disabled={busy || !!blocked || !signature || !name.trim()}
        >
          {busy ? "記録を確定中…" : "サインして検収を確定"}
        </button>
      </form>
    </>
  );
}
