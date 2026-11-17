"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { StoreProvider, useStore } from "./store-provider";

const links = [
  { href: "/", symbol: "▦", label: "今日の入荷" },
  { href: "/deliveries", symbol: "▤", label: "納品一覧" },
  { href: "/issues", symbol: "!", label: "不備一覧" },
  { href: "/about", symbol: "i", label: "このデモについて" },
];

function Frame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { message, notify, today } = useStore();
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch(() => notify("オフライン機能を準備できませんでした。オンラインでご利用ください。"));
    }
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [notify]);
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    // 初回表示はSW登録前に読み込まれるため、現在のHTMLと取得済み静的資産を補完する。
    void navigator.serviceWorker.ready.then((registration) => {
      const assets = performance
        .getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((name) => {
          const url = new URL(name);
          return url.origin === location.origin && url.pathname.startsWith("/_next/static/");
        });
      registration.active?.postMessage({ type: "CACHE_VISIT", path: pathname, assets });
    });
  }, [pathname]);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        本文へ移動
      </a>
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark">✓</span>
          <span>
            納品・検収<span className="brand-small">CHECK / 受け入れを確かに</span>
          </span>
        </Link>
        <div className="workspace">
          <span className="workspace-icon">▣</span>
          <div>
            受入ワークスペース<small>店舗・事務所・倉庫</small>
          </div>
        </div>
        <p className="nav-caption">WORKSPACE</p>
        <nav aria-label="メインナビゲーション">
          {links.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={active ? "nav-link active" : "nav-link"}
                aria-current={active ? "page" : undefined}
              >
                <span className="nav-symbol">{link.symbol}</span>
                <span>{link.label}</span>
                {active && <span className="nav-dot" />}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-note">
          <span className="online-dot" /> この端末に保存
          <p>
            記録はブラウザ内で管理。
            <br />
            外部には送信されません。
          </p>
        </div>
        <div className="sidebar-footer">
          DEMO WORKSPACE <span>v1.0</span>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>
            受け入れ管理 <span className="slash">/</span>{" "}
            {
              links.find((l) => (l.href === "/" ? pathname === "/" : pathname.startsWith(l.href)))
                ?.label
            }
          </span>
          <span className="topbar-right">
            <span className="demo-pill">デモ用の架空データです</span>
            <span className="avatar">受</span>
          </span>
        </header>
        {offline && (
          <div className="offline" role="status">
            オフライン（この端末に保存されます）
          </div>
        )}
        {message && (
          <div className="toast" role="status">
            <span>{message}</span>
            <button aria-label="通知を閉じる" onClick={() => notify("")}>
              ×
            </button>
          </div>
        )}
        <main id="main">{children}</main>
        <footer className="page-footer">
          <span>納品・検収チェック</span>
          <span>{today && `${today} · `}端末内保存 / 日本時間</span>
        </footer>
      </div>
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <Frame>{children}</Frame>
    </StoreProvider>
  );
}
