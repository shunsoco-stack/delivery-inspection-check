"use client";

import Link from "next/link";
import { useState } from "react";
import { issues, status } from "@/lib/inspection";
import { useStore } from "./store-provider";
import { DeliveryList, Loading, PageHeading } from "./common";

export function Dashboard() {
  const { data, today } = useStore();
  const [tab, setTab] = useState("すべて");
  if (!data) return <Loading />;
  const ds = data.deliveries;
  const incoming = ds.filter((d) => d.scheduled === today && !d.receipt);
  const active = ds.filter((d) => status(d) === "検品中");
  const trouble = ds.filter((d) => status(d) === "差異あり");
  const completed = ds
    .filter((d) => d.receipt)
    .sort((a, b) => b.receipt!.at.localeCompare(a.receipt!.at));
  const pending = issues(ds).filter((i) => i.line.resolution !== "解決");
  const displayed = ds
    .filter((d) => !d.receipt && (d.scheduled === today || d.arrived))
    .filter((d) => tab === "すべて" || status(d) === tab);
  return (
    <>
      <PageHeading
        eyebrow="RECEIVING OVERVIEW"
        title="今日の入荷"
        description="届いたものを、ひとつずつ。今日の受け入れ状況を確認しましょう。"
      >
        <Link href="/deliveries?new=1" className="button primary">
          ＋ 納品を登録
        </Link>
      </PageHeading>
      <div className="date-strip">
        <span className="online-dot" />
        <strong>{today.replaceAll("-", " / ")}</strong>
        <span>受け入れ状況</span>
        <span className="date-strip-right">端末内に自動保存</span>
      </div>
      <div className="stat-grid">
        {[
          {
            title: "今日の到着予定",
            count: incoming.length,
            unit: "件",
            note: "本日の受け入れ対象",
            tone: "navy",
            icon: "▣",
            href: "/deliveries",
          },
          {
            title: "検品中",
            count: active.length,
            unit: "件",
            note: "引き続き照合しましょう",
            tone: "blue",
            icon: "≡",
            href: "/deliveries?status=検品中",
          },
          {
            title: "差異あり・要確認",
            count: trouble.length,
            unit: "件",
            note: `未解決の不備 ${pending.length} 件`,
            tone: "amber",
            icon: "!",
            href: "/issues",
          },
          {
            title: "検収済み",
            count: completed.filter((d) => status(d) === "検収済み").length,
            unit: "件",
            note: "サイン付きの確定記録",
            tone: "green",
            icon: "✓",
            href: "/deliveries?status=検収済み",
          },
        ].map((s) => (
          <Link href={s.href} key={s.title} className={`stat-card ${s.tone}`}>
            <div className="stat-label">
              {s.title}
              <span className="stat-icon">{s.icon}</span>
            </div>
            <div className="stat-value">
              {s.count}
              <span>{s.unit}</span>
            </div>
            <p>
              {s.note}
              <span>↗</span>
            </p>
          </Link>
        ))}
      </div>
      {pending.length > 0 && (
        <Link href="/issues" className="attention-banner">
          <span className="attention-icon">!</span>
          <div>
            <strong>確認を待っている不備が {pending.length} 件あります</strong>
            <span>写真とコメントを確認して、対応状況を更新しましょう。</span>
          </div>
          <span className="banner-link">不備一覧を見る →</span>
        </Link>
      )}
      <section className="panel">
        <div className="section-header">
          <div>
            <h2>
              受け入れ・検品リスト <span className="count-chip">{displayed.length}</span>
            </h2>
            <p>今日到着予定の納品と、確認中の納品</p>
          </div>
          <Link href="/deliveries" className="text-link">
            すべての納品 →
          </Link>
        </div>
        <div className="tabs" aria-label="状態で絞り込む">
          {["すべて", "未着", "検品中", "差異あり"].map((v) => (
            <button className={v === tab ? "selected" : ""} key={v} onClick={() => setTab(v)}>
              {v}
            </button>
          ))}
        </div>
        <DeliveryList deliveries={displayed} />
      </section>
      <div className="dashboard-bottom">
        <section className="panel recent">
          <div className="section-header">
            <div>
              <h2>最近の検収記録</h2>
              <p>確定した受け入れの記録</p>
            </div>
            <span className="subtle-icon">✓</span>
          </div>
          {completed.slice(0, 3).map((d) => (
            <Link className="recent-row" href={`/deliveries/${d.id}/record`} key={d.id}>
              <span className="receipt-icon">✓</span>
              <div>
                <strong>{d.supplier}</strong>
                <small>
                  {d.number} · {d.receipt!.result}
                </small>
              </div>
              <span>›</span>
            </Link>
          ))}
        </section>
        <section className="guide-card">
          <p className="eyebrow">SMOOTH RECEIVING</p>
          <h2>
            受け入れを、
            <br />
            確かな記録に。
          </h2>
          <ol>
            <li>
              <span>01</span>納品書と現物を照合
            </li>
            <li>
              <span>02</span>不備は写真・コメントで記録
            </li>
            <li>
              <span>03</span>サインして検収を完了
            </li>
          </ol>
          <p>記録はこの端末に保存されます。</p>
        </section>
      </div>
    </>
  );
}
