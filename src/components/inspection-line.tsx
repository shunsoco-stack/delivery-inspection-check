"use client";

import { conditions, policies, resolutions } from "@/lib/types";
import type { Line } from "@/lib/types";
import { judge } from "@/lib/inspection";
import { Badge } from "./common";
import { PhotoGallery } from "./photo-gallery";

export function InspectionLine({
  line,
  index,
  disabled,
  onChange,
}: {
  line: Line;
  index: number;
  disabled: boolean;
  onChange: (line: Line) => void;
}) {
  const differences = judge(line);
  function change(patch: Partial<Line>) {
    onChange({ ...line, ...patch });
  }
  return (
    <article className={`inspection-line ${differences.length ? "has-issue" : ""}`}>
      <div className="line-heading">
        <span className={`line-number ${line.checked ? "done" : ""}`}>
          {line.checked ? "✓" : String(index + 1).padStart(2, "0")}
        </span>
        <div>
          <h3>{line.name}</h3>
          <small>
            {line.code || "品番なし"} <span className="separator">/</span> 納品書数量{" "}
            <strong>
              {line.expected} {line.unit}
            </strong>
          </small>
        </div>
        <div className="line-badges">
          {differences.map((s) => (
            <Badge value={s} key={s} />
          ))}
          {line.checked && !differences.length && <Badge value="良好" />}
        </div>
      </div>
      <fieldset disabled={disabled} className="line-fieldset">
        <div className="line-controls">
          <label>
            実数（{line.unit}）
            <div className="quantity">
              <button
                aria-label={`${line.name}の実数を減らす`}
                onClick={() =>
                  change({
                    actual: Math.max(0, (line.actual ?? line.expected) - 1),
                    checked: false,
                  })
                }
              >
                −
              </button>
              <input
                aria-label={`${line.name}の実数`}
                type="number"
                min="0"
                step="1"
                value={line.actual ?? ""}
                placeholder="未入力"
                onChange={(e) => {
                  const value = e.target.value === "" ? null : Number(e.target.value);
                  if (value === null || (Number.isSafeInteger(value) && value >= 0))
                    change({ actual: value, checked: false });
                }}
              />
              <button
                aria-label={`${line.name}の実数を増やす`}
                onClick={() =>
                  change({ actual: (line.actual ?? line.expected) + 1, checked: false })
                }
              >
                ＋
              </button>
            </div>
          </label>
          <label>
            状態
            <select
              value={line.condition}
              onChange={(e) =>
                change({ condition: e.target.value as Line["condition"], checked: false })
              }
            >
              {conditions.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <button
            className="ok-button"
            onClick={() => change({ actual: line.expected, condition: "良好", checked: true })}
          >
            ✓ OK<span>数量一致・良好</span>
          </button>
        </div>
        <label>
          コメント
          <textarea
            rows={2}
            value={line.comment}
            placeholder="気づいたこと・確認事項を記録"
            onChange={(e) => change({ comment: e.target.value })}
          />
        </label>
        {differences.length > 0 && (
          <div className="issue-details">
            <div className="issue-title">
              <strong>! 不備の記録</strong>
              <small>写真は最大3枚 / 長辺1280pxに縮小</small>
            </div>
            <PhotoGallery
              ids={line.photos}
              locked={disabled}
              onChange={(photos) => change({ photos })}
            />
            <div className="form-grid">
              <label>
                対応方針
                <select
                  value={line.policy}
                  onChange={(e) => change({ policy: e.target.value as Line["policy"] })}
                >
                  {policies.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                対応状況
                <select
                  value={line.resolution}
                  onChange={(e) => change({ resolution: e.target.value as Line["resolution"] })}
                >
                  {resolutions.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        )}
        {!differences.length && line.photos.length > 0 && (
          <PhotoGallery
            ids={line.photos}
            locked={disabled}
            onChange={(photos) => change({ photos })}
          />
        )}
        {(!line.checked || differences.length > 0) && (
          <button
            className="wide confirm-line"
            disabled={line.actual === null}
            onClick={() => change({ checked: !line.checked })}
          >
            {line.checked ? "確認済み ✓（再確認する）" : "この内容で確認済みにする"}
          </button>
        )}
      </fieldset>
    </article>
  );
}
