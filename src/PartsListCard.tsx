// The parts list on the Parts section: parts collected with "Add to list", each
// with a quantity, downloaded together as one file (laid out in rows, like
// "Download all" on the Calibrate section).
import { useState } from "react";

import { PartIcon } from "./PartPicker";
import { describeItem, totalCount, MAX_COUNT, type ListItem } from "./partsList";
import { stepText } from "./stepper";
import { parseNumber } from "./parseNumber";

// The quantity of one line. While typing, the field shows the text as typed, so
// it can be cleared and retyped; a valid number is applied at once, and leaving
// the field shows the quantity again.
function CountField({ name, count, onChange }: { name: string; count: number; onChange: (count: number) => void }) {
  const [typed, setTyped] = useState<string | null>(null);
  const range = { step: 1, min: 1, max: MAX_COUNT, fallback: 1 };
  const apply = (text: string) => {
    const n = parseNumber(text);
    if (n !== null && Number.isInteger(n) && n >= 1 && n <= MAX_COUNT) onChange(n);
  };
  return (
    <div className="stepper count">
      <button type="button" aria-label={`Fewer: ${name}`} onClick={() => apply(stepText(String(count), -1, range))}>
        −
      </button>
      <input
        aria-label={`Number of ${name}`}
        type="text"
        inputMode="numeric"
        value={typed ?? String(count)}
        onChange={(e) => {
          setTyped(e.target.value);
          apply(e.target.value);
        }}
        onBlur={() => setTyped(null)}
      />
      <button type="button" aria-label={`More: ${name}`} onClick={() => apply(stepText(String(count), 1, range))}>
        +
      </button>
    </div>
  );
}

interface PartsListProps {
  list: ListItem[];
  onChange: (list: ListItem[]) => void;
  onShow: (item: ListItem) => void; // puts the part in the form
  onDownload: () => void;
  downloadLabel: string; // "Download list as STEP"
  fileName: string | null; // null while it can't be downloaded
  problem: string | null; // why it can't be downloaded
  disabled: boolean;
}

export default function PartsList({
  list,
  onChange,
  onShow,
  onDownload,
  downloadLabel,
  fileName,
  problem,
  disabled,
}: PartsListProps) {
  // Undo instead of confirmations, as in the fit settings.
  const [message, setMessage] = useState<{ text: string; undo: ListItem[] } | null>(null);
  const total = totalCount(list);
  const change = (next: ListItem[], text: string) => {
    setMessage({ text, undo: list });
    onChange(next);
  };

  return (
    <section id="parts-list" className="card parts-list" aria-labelledby="parts-list-title" tabIndex={-1}>
      <div className="list-head">
        <h2 id="parts-list-title">Parts list</h2>
        <span className="note">
          {total} {total === 1 ? "part" : "parts"}
        </span>
      </div>
      {list.length === 0 && <p className="note">Empty. “Add to list” collects parts to download together.</p>}
      <ul className="list-items">
        {list.map((item, i) => {
          const { name, detail } = describeItem(item);
          const label = `${name}, ${detail}`;
          return (
            <li key={`${item.partId}-${JSON.stringify(item.params)}`}>
              <PartIcon id={item.partId} />
              <span className="item-text">
                <span className="item-name">{name}</span>
                <span className="note">{detail}</span>
              </span>
              <CountField
                name={label}
                count={item.count}
                onChange={(count) => onChange(list.map((it, k) => (k === i ? { ...it, count } : it)))}
              />
              <span className="item-actions">
                <button
                  type="button"
                  className="link"
                  onClick={() => onShow(item)}
                  aria-label={`Show in the form: ${label}`}
                >
                  Show
                </button>
                <button
                  type="button"
                  className="link"
                  onClick={() =>
                    change(
                      list.filter((_, k) => k !== i),
                      `Removed: ${label}.`,
                    )
                  }
                  aria-label={`Remove: ${label}`}
                >
                  Remove
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      {list.length > 0 && (
        <div className="actions">
          <button type="button" className="button" onClick={onDownload} disabled={disabled || !fileName}>
            {downloadLabel}
          </button>
          <button type="button" className="button secondary" onClick={() => change([], "The list is empty.")}>
            Clear list
          </button>
        </div>
      )}
      {list.length === 0 ? null : problem ? (
        <p role="alert" className="alert">
          {problem}
        </p>
      ) : (
        fileName && (
          <p className="note">One file, {fileName}, with every part laid out in rows, using your fit settings.</p>
        )
      )}
      {message && (
        <p role="status" className="note">
          {message.text}{" "}
          <button
            type="button"
            className="link"
            onClick={() => {
              onChange(message.undo);
              setMessage(null);
            }}
          >
            Undo
          </button>
        </p>
      )}
    </section>
  );
}
