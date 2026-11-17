import type { Delivery } from "@/lib/types";
import { formatTime } from "@/lib/dates";

export function CancellationHistory({ delivery }: { delivery: Delivery }) {
  if (!delivery.history.length) return null;
  return (
    <section className="history">
      <h3>検収の取り消し履歴</h3>
      {delivery.history.map((entry, index) => (
        <div key={`${entry.at}-${index}`}>
          <strong>{formatTime(entry.at)}</strong>
          <p>{entry.reason}</p>
          <small>
            旧検収：{entry.receipt.name} / {entry.receipt.result}
            <br />
            旧指紋：{entry.receipt.hash.slice(0, 16)}
          </small>
        </div>
      ))}
    </section>
  );
}
