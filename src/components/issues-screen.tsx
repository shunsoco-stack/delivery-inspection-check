"use client";

import Link from "next/link";
import { useState } from "react";
import { issues, judge } from "@/lib/inspection";
import { policies, resolutions } from "@/lib/types";
import type { Line } from "@/lib/types";
import { useStore } from "./store-provider";
import { Badge, Loading, PageHeading } from "./common";
import { PhotoGallery } from "./photo-gallery";

export function IssuesScreen() {
  const { data, update } = useStore();
  const [filters, setFilters] = useState({ supplier: "", policy: "", resolution: "" });
  if (!data) return <Loading />;
  const rows = issues(data.deliveries, filters);
  return (
    <>
      <PageHeading
        eyebrow="ISSUE FOLLOW-UP"
        title="不備一覧"
        description="写真とコメントをもとに、受け入れ時の不備を解決まで確認します。"
      />
      <section className="panel">
        <div className="filters">
          {(
            [
              ["supplier", "納品元", [...new Set(data.deliveries.map((d) => d.supplier))]],
              ["policy", "対応方針", policies],
              ["resolution", "対応状況", resolutions],
            ] as const
          ).map(([key, label, options]) => (
            <label key={key}>
              {label}
              <select
                value={filters[key]}
                onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
              >
                <option value="">すべて</option>
                {options.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </section>
      <div className="section-header">
        <h2>{rows.length} 件の不備</h2>
        <span className="muted">未解決の不備を上に表示</span>
      </div>
      <div className="issue-grid">
        {rows.map(({ delivery: d, line: l }) => (
          <article className="panel issue-card" key={l.id}>
            <div className="issue-card-top">
              <small>
                {d.number} / {d.supplier}
              </small>
              <Badge value={l.resolution} />
            </div>
            <h2>{l.name}</h2>
            <div className="button-group">
              {judge(l).map((s) => (
                <Badge value={s} key={s} />
              ))}
              <span>
                納品書 {l.expected} → 実数 {l.actual} {l.unit}
              </span>
            </div>
            <p>{l.comment || "コメントなし"}</p>
            <PhotoGallery ids={l.photos} locked />
            <div className="issue-card-footer">
              <span>対応方針：{l.policy}</span>
              <label>
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
            </div>
            <Link className="button wide" href={`/deliveries/${d.id}${d.receipt ? "/record" : ""}`}>
              元の納品を確認 →
            </Link>
          </article>
        ))}
      </div>
      {!rows.length && <div className="empty">該当する不備はありません。</div>}
    </>
  );
}
