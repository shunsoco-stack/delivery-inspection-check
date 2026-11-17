import { sha256 } from "./inspection";

async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("dic-photos", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("photos");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("写真データベースを開けません。"));
  });
}

async function transact<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("photos", mode);
    const request = operation(tx.objectStore("photos"));
    tx.oncomplete = () => {
      db.close();
      resolve(request.result);
    };
    tx.onerror = tx.onabort = () => {
      db.close();
      reject(new Error("写真の保存・読込に失敗しました。容量を確認してください。"));
    };
  });
}

export async function putPhoto(blob: Blob): Promise<string> {
  const id = await sha256(await blob.arrayBuffer());
  await transact("readwrite", (store) => store.put(blob, id));
  return id;
}
export async function getPhoto(id: string): Promise<Blob | undefined> {
  return transact("readonly", (store) => store.get(id));
}
export async function clearPhotos(): Promise<void> {
  await transact("readwrite", (store) => store.clear());
}
export async function photoUsage(): Promise<{ count: number; bytes: number }> {
  const blobs: Blob[] = await transact("readonly", (store) => store.getAll());
  return { count: blobs.length, bytes: blobs.reduce((sum, b) => sum + b.size, 0) };
}
export async function prunePhotos(referenced: string[]): Promise<void> {
  const keys = await transact("readonly", (store) => store.getAllKeys());
  for (const key of keys) {
    if (!referenced.includes(String(key)))
      await transact("readwrite", (store) => store.delete(key));
  }
}

export async function resizePhoto(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("画像ファイルを選択してください。");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("画像を変換できません。別の画像を選択してください。")),
      "image/jpeg",
      0.7,
    ),
  );
}

export function sampleSignature(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 180;
  const ctx = canvas.getContext("2d")!;
  ctx.strokeStyle = "#163d47";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(70, 120);
  ctx.bezierCurveTo(190, 20, 90, 170, 220, 70);
  ctx.bezierCurveTo(170, 150, 320, 130, 350, 50);
  ctx.bezierCurveTo(310, 170, 390, 80, 490, 100);
  ctx.stroke();
  return canvas.toDataURL("image/png");
}

export async function samplePhoto(kind: string): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 420;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f1eee6";
  ctx.fillRect(0, 0, 640, 420);
  ctx.fillStyle = "#b88f63";
  ctx.beginPath();
  ctx.moveTo(150, 130);
  ctx.lineTo(460, 110);
  ctx.lineTo(490, 310);
  ctx.lineTo(170, 330);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#725334";
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = "#e5caa5";
  ctx.fillRect(290, 125, 35, 190);
  ctx.strokeStyle = kind.includes("wet") ? "#3f7697" : "#725334";
  ctx.beginPath();
  ctx.moveTo(150, 130);
  ctx.lineTo(210, 180);
  ctx.lineTo(180, 220);
  ctx.lineTo(230, 240);
  ctx.stroke();
  if (kind.includes("wet")) {
    ctx.fillStyle = "#52899b99";
    ctx.beginPath();
    ctx.ellipse(390, 280, 110, 45, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#263d46";
  ctx.font = "22px sans-serif";
  ctx.fillText("サンプル画像（架空）", 28, 45);
  ctx.font = "18px sans-serif";
  ctx.fillText(
    kind.includes("lot")
      ? "ロット表示：SAMPLE-B"
      : kind.includes("wet")
        ? "濡れた段ボールのイラスト"
        : "へこんだ箱のイラスト",
    28,
    390,
  );
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.7));
}
