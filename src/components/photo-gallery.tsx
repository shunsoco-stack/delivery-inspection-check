"use client";

import { useEffect, useState } from "react";
import { getPhoto, putPhoto, resizePhoto } from "@/lib/photos";
import { useStore } from "./store-provider";

export function PhotoGallery({
  ids,
  locked = false,
  onChange,
}: {
  ids: string[];
  locked?: boolean;
  onChange?: (ids: string[]) => void;
}) {
  const { notify } = useStore();
  const [photos, setPhotos] = useState<{ id: string; url: string }[]>([]);
  const [expanded, setExpanded] = useState("");
  const [busy, setBusy] = useState(false);
  const key = ids.join(",");
  useEffect(() => {
    let live = true;
    const urls: string[] = [];
    Promise.all(
      key
        .split(",")
        .filter(Boolean)
        .map(async (id) => {
          const blob = await getPhoto(id);
          const url = blob ? URL.createObjectURL(blob) : "";
          if (url) urls.push(url);
          return { id, url };
        }),
    )
      .then((items) => {
        if (live) setPhotos(items);
        else urls.forEach(URL.revokeObjectURL);
      })
      .catch(() => notify("写真を読み込めませんでした。"));
    return () => {
      live = false;
      urls.forEach(URL.revokeObjectURL);
    };
  }, [key, notify]);

  async function upload(files: FileList | null) {
    if (!files || !onChange) return;
    if (files.length + ids.length > 3) {
      notify("写真は1行につき最大3枚です。");
      return;
    }
    setBusy(true);
    try {
      const added: string[] = [];
      for (const file of Array.from(files)) added.push(await putPhoto(await resizePhoto(file)));
      onChange([...new Set([...ids, ...added])]);
    } catch (error) {
      notify(error instanceof Error ? error.message : "写真を保存できませんでした。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="photo-section">
      <div className="photo-grid">
        {photos.map(({ id, url }, i) => (
          <div className="photo-item" key={id}>
            {url ? (
              <button
                className="photo-button"
                onClick={() => setExpanded(url)}
                aria-label={`不備写真${i + 1}を拡大`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`不備の証拠写真 ${i + 1}`} />
              </button>
            ) : (
              <div className="photo-missing">
                写真なし
                <br />
                削除済み
              </div>
            )}
            {!locked && (
              <button
                className="text-button danger-text"
                onClick={() => onChange?.(ids.filter((v) => v !== id))}
              >
                削除
              </button>
            )}
          </div>
        ))}
        {!locked && ids.length < 3 && (
          <label className="photo-add">
            ＋<span>{busy ? "保存中…" : "写真を追加"}</span>
            <small>{ids.length} / 3 枚</small>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              disabled={busy}
              multiple
              onChange={(e) => {
                void upload(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
      {expanded && (
        <div className="modal-backdrop" onClick={() => setExpanded("")}>
          <div
            className="photo-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="不備写真の拡大"
          >
            <button autoFocus onClick={() => setExpanded("")}>
              閉じる ×
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={expanded} alt="不備写真の拡大" />
          </div>
        </div>
      )}
    </div>
  );
}
