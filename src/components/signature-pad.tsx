"use client";

import { useRef } from "react";

export function SignaturePad({ onChange }: { onChange: (value: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) * canvas.width) / bounds.width,
      y: ((event.clientY - bounds.top) * canvas.height) / bounds.height,
    };
  }
  return (
    <div className="signature-pad">
      <canvas
        ref={ref}
        width={900}
        height={300}
        aria-label="指またはマウスでサインしてください"
        onPointerDown={(event) => {
          event.preventDefault();
          const canvas = event.currentTarget;
          canvas.setPointerCapture(event.pointerId);
          const ctx = canvas.getContext("2d")!;
          const p = point(event);
          drawing.current = true;
          ctx.strokeStyle = "#173c42";
          ctx.lineWidth = 4;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + 0.5, p.y + 0.5);
          ctx.stroke();
        }}
        onPointerMove={(event) => {
          if (!drawing.current) return;
          const p = point(event);
          const ctx = event.currentTarget.getContext("2d")!;
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }}
        onPointerUp={(event) => {
          if (!drawing.current) return;
          drawing.current = false;
          onChange(event.currentTarget.toDataURL("image/png"));
        }}
        onPointerCancel={(event) => {
          if (!drawing.current) return;
          drawing.current = false;
          onChange(event.currentTarget.toDataURL("image/png"));
        }}
      />
      <div className="signature-footer">
        <span>指・マウスで枠内にサイン</span>
        <button
          type="button"
          onClick={() => {
            ref.current?.getContext("2d")?.clearRect(0, 0, 900, 300);
            onChange("");
          }}
        >
          書き直す・クリア
        </button>
      </div>
    </div>
  );
}
