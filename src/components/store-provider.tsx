"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { generateSeed } from "@/lib/seed";
import { allowedUpdate, normalizeRecord, sha256 } from "@/lib/inspection";
import { prunePhotos, putPhoto, samplePhoto, sampleSignature } from "@/lib/photos";
import { parseStore, saveStore, STORAGE_KEY } from "@/lib/storage";
import type { Delivery, Store } from "@/lib/types";

type Context = {
  data: Store | null;
  today: string;
  message: string;
  notify: (message: string) => void;
  update: (delivery: Delivery) => boolean;
  remove: (id: string) => boolean;
  reset: () => Promise<void>;
};
const StoreContext = createContext<Context | null>(null);

async function initialData(): Promise<Store> {
  const data = generateSeed(new Date());
  const signature = sampleSignature();
  for (const d of data.deliveries) {
    for (const l of d.lines) {
      l.photos = await Promise.all(l.photos.map(async (id) => putPhoto(await samplePhoto(id))));
    }
    if (d.receipt) {
      d.receipt.signature = signature;
      d.receipt.hash = await sha256(normalizeRecord(d));
    }
  }
  return data;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Store | null>(null);
  const ref = useRef<Store | null>(null);
  const [today, setToday] = useState("");
  const [message, notify] = useState("");
  const [error, setError] = useState("");
  const boot = useRef(false);

  useEffect(() => {
    async function load() {
      try {
        setToday(new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10));
        const raw = localStorage.getItem(STORAGE_KEY);
        let value = raw ? parseStore(raw) : null;
        if (!value) {
          value = await initialData();
          saveStore(value);
          if (raw) notify("保存データが壊れていたため、既定データに戻しました。");
        }
        ref.current = value;
        setData(value);
      } catch {
        setError(
          "端末への保存を開始できません。ブラウザの保存設定と空き容量を確認し、再読み込みしてください。",
        );
      }
    }
    if (!boot.current) {
      boot.current = true;
      void load();
    }
    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      const value = parseStore(event.newValue);
      if (value) {
        ref.current = value;
        setData(value);
        notify("別のタブで保存された内容に更新しました。");
      } else notify("別のタブの保存データが不正です。再読み込みしてください。");
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  function commit(next: Store): boolean {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && ref.current && saved !== JSON.stringify(ref.current)) {
        const latest = parseStore(saved);
        if (latest) {
          ref.current = latest;
          setData(latest);
        }
        notify("別のタブで記録が更新されました。最新の内容を確認してから操作してください。");
        return false;
      }
      saveStore(next);
      ref.current = next;
      setData(next);
      return true;
    } catch {
      notify("保存できませんでした。入力内容または端末の空き容量を確認してください。");
      return false;
    }
  }

  function update(delivery: Delivery): boolean {
    const current = ref.current;
    if (!current) return false;
    const exists = current.deliveries.find((d) => d.id === delivery.id);
    if (exists && !allowedUpdate(exists, delivery)) {
      notify("検収済みの記録は変更できません。取り消し理由を記録して再検品してください。");
      return false;
    }
    return commit({
      version: 1,
      deliveries: exists
        ? current.deliveries.map((d) => (d.id === delivery.id ? delivery : d))
        : [delivery, ...current.deliveries],
    });
  }

  async function reset() {
    const next = await initialData();
    if (commit(next)) {
      await prunePhotos(next.deliveries.flatMap((d) => d.lines.flatMap((l) => l.photos)));
      notify("写真・サインを含めて既定データに戻しました。");
    }
  }

  // 全写真削除では記録の参照を保持し、証拠が失われたことを記録画面に表示する。
  return (
    <StoreContext.Provider
      value={{
        data,
        today,
        message,
        notify,
        update,
        reset,
        remove: (id) =>
          !!ref.current &&
          !ref.current.deliveries.find((d) => d.id === id)?.receipt &&
          commit({ version: 1, deliveries: ref.current.deliveries.filter((d) => d.id !== id) }),
      }}
    >
      {error ? (
        <div className="notice error" role="alert">
          {error}
        </div>
      ) : (
        children
      )}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("保存コンテキストがありません。");
  return value;
}
