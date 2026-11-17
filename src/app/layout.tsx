import type { Metadata, Viewport } from "next";
import { Shell } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "納品・検収チェック",
  description:
    "納品書と現物を1行ずつ照合。不備の写真・コメントと手書きサインを端末に残す受け入れ検収アプリ。",
};

export const viewport: Viewport = { themeColor: "#173e3b", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
