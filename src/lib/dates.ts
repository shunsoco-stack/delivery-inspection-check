export function japanDate(now: Date | string = new Date()): string {
  return new Date(new Date(now).getTime() + 9 * 3600000).toISOString().slice(0, 10);
}

export function relativeDate(now: Date, days: number): string {
  return japanDate(new Date(now.getTime() + days * 86400000));
}

export function before(now: Date, minutes: number): string {
  return new Date(now.getTime() - minutes * 60000).toISOString();
}

export function formatTime(value: string): string {
  if (!value) return "未到着";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function toJapanInput(value: string): string {
  if (!value) return "";
  return new Date(new Date(value).getTime() + 9 * 3600000).toISOString().slice(0, 16);
}

export function fromJapanInput(value: string): string {
  return value ? new Date(`${value}:00+09:00`).toISOString() : "";
}
