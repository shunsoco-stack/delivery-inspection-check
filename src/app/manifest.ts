import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "納品・検収チェック",
    short_name: "納品検収",
    description: "納品明細の照合・不備の記録・サインによる検収",
    lang: "ja",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f7f8",
    theme_color: "#173e3b",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
