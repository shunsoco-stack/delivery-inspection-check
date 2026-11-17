/* オフライン用キャッシュ。リリース時は VERSION を更新する。 */
const VERSION = "dic-v1-20261118-a";
const PAGES = `${VERSION}-pages`;
const ASSETS = `${VERSION}-assets`;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(ASSETS).then((cache) => cache.addAll(["/icon.svg"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("dic-") && ![PAGES, ASSETS].includes(key))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  // RSC と HTML を混同しない。遷移レスポンスはクエリ付き URL のまま保存する。
  const navigation = request.mode === "navigate";
  const rsc = request.headers.get("RSC") === "1";
  const name = navigation || rsc ? PAGES : ASSETS;
  event.respondWith(
    (async () => {
      const cache = await caches.open(name);
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        const cached = await cache.match(request);
        if (cached) return cached;
        if (navigation) {
          return new Response(
            '<!doctype html><html lang="ja"><meta charset="utf-8">' +
              '<meta name="viewport" content="width=device-width"><title>オフライン</title>' +
              "<body><h1>オフライン</h1><p>この画面はまだ保存されていません。" +
              'オンラインで一度開いてください。</p><a href="/">今日の入荷へ</a></body></html>',
            { headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }
        return new Response("Offline", { status: 503 });
      }
    })(),
  );
});

/* クライアント遷移でもHTMLを保存し、直接アクセスでのオフライン再訪を可能にする。 */
self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_VISIT") return;
  event.waitUntil(
    (async () => {
      const path = event.data.path;
      if (
        typeof path !== "string" ||
        !/^\/(?:deliveries(?:\/[^/?]+(?:\/(?:sign|record))?)?|issues|about)?$/.test(path)
      )
        return;
      const pages = await caches.open(PAGES);
      const assets = await caches.open(ASSETS);
      const urls = Array.isArray(event.data.assets) ? event.data.assets : [];
      await Promise.allSettled([
        pages.add(new Request(path, { headers: { Accept: "text/html" } })),
        ...urls
          .filter((value) => {
            try {
              const url = new URL(value);
              return (
                url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")
              );
            } catch {
              return false;
            }
          })
          .map((url) => assets.add(url)),
      ]);
    })(),
  );
});
