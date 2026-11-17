"use client";

import { useEffect, useState } from "react";
import { clearPhotos, photoUsage, prunePhotos } from "@/lib/photos";
import { useStore } from "./store-provider";
import { PageHeading } from "./common";

export function AboutScreen() {
  const { data, reset, notify } = useStore();
  const [usage, setUsage] = useState({ count: 0, bytes: 0 });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void photoUsage()
      .then(setUsage)
      .catch(() => notify("写真容量を取得できませんでした。"));
  }, [notify]);
  async function action(kind: "reset" | "photos") {
    const message =
      kind === "reset"
        ? "すべての納品・写真・サインを既定データに戻します。現在の記録は失われます。"
        : "すべての写真を削除します。検収済み記録の写真も復元できません。記録に写真欠落の警告が表示されます。";
    if (!window.confirm(message)) return;
    setBusy(true);
    try {
      if (kind === "reset") {
        await reset();
      } else {
        await clearPhotos();
        notify("すべての写真を削除しました。記録の写真参照は履歴として残ります。");
      }
      setUsage(await photoUsage());
    } catch {
      notify("操作に失敗しました。ブラウザの保存設定を確認してください。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="ABOUT THIS DEMO"
        title="このデモについて"
        description="小さな店舗・事務所・工場の、受け取る側の検収アプリです。"
      />
      <div className="about-grid">
        <section className="panel prose">
          <h2>受け入れを、確かな記録に</h2>
          <p>
            納品書の明細と現物を1行ずつ照合。不備の写真とコメントを残し、検収者のサインで記録を確定します。
          </p>
          <p>金額・請求・発注・在庫・配送業務は扱いません。発注番号は納品書上の参照文字列です。</p>
          <h3>すべて架空のデモデータです</h3>
          <p>
            会社名、担当者、明細、サインはすべて架空です。実在の企業・商品・個人とは無関係です。日付は初回起動・リセット時の日本時間から相対生成します。
          </p>
          <p>初期写真はアプリ内で描いたイラストで、「サンプル画像（架空）」と明記しています。</p>
          <h3>記録の指紋について</h3>
          <p>
            SHA-256
            による簡易な改ざん検知のデモです。法的な電子署名ではありません。記録と指紋を同時に書き換える操作は防げません。検収後に変更できる対応状況は指紋の対象外です。
          </p>
        </section>
        <section className="panel prose">
          <h2>この端末だけに保存</h2>
          <dl>
            <dt>納品・明細・検収記録・サイン</dt>
            <dd>localStorage / キー：dic:v1</dd>
            <dt>不備写真</dt>
            <dd>IndexedDB / DB名：dic-photos</dd>
          </dl>
          <p>
            外部API・クラウド保存・認証・メール送信はありません。ブラウザのデータ消去で記録は失われます。必要な記録はPDFやCSVで保管してください。
          </p>
          <h3>倉庫でも使える PWA</h3>
          <p>
            本番環境では一度開いた画面と静的ファイルを端末にキャッシュします。ホーム画面への追加はブラウザのメニューから行えます。まだ開いていない画面は、オンラインで先に開いてください。
          </p>
          <h3>写真の容量</h3>
          <p>
            長辺1280px、JPEG品質0.7に縮小。1枚およそ100〜400KBが目安です（画像により変動）。1行最大3枚です。
          </p>
          <div className="usage">
            <strong>{usage.count} 枚</strong>
            <span>約 {(usage.bytes / 1024 / 1024).toFixed(2)} MB 使用中</span>
          </div>
        </section>
      </div>
      <section className="panel prose">
        <h2>データを管理</h2>
        <p>操作はこのブラウザに保存されたデータだけに適用されます。</p>
        <div className="button-group">
          <button disabled={busy || !data} onClick={() => void action("reset")}>
            既定データに戻す
          </button>
          <button disabled={busy} className="danger-text" onClick={() => void action("photos")}>
            全写真を削除
          </button>
          <button
            disabled={busy || !data}
            onClick={async () => {
              try {
                await prunePhotos(
                  data!.deliveries.flatMap((d) => d.lines.flatMap((l) => l.photos)),
                );
                setUsage(await photoUsage());
                notify("使われていない写真を整理しました。");
              } catch {
                notify("写真を整理できませんでした。");
              }
            }}
          >
            未使用の写真を整理
          </button>
        </div>
      </section>
    </>
  );
}
