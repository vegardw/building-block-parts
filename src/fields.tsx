// Form fields shared by the Parts and Calibrate sections and the fit settings.
import type { InputHTMLAttributes, ReactNode } from "react";
import type { NumberParamDef, ParamText, PartDefinition } from "./parts/types";
import { parseNumber } from "./parseNumber";
import { stepText, type StepRange } from "./stepper";

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  id: string;
  label: string;
  hint?: string | undefined;
  aside?: ReactNode; // shown at the end of the label's line, e.g. where a value came from
  invalid?: boolean; // marks the field; the message itself is shown elsewhere
  error?: string | undefined; // marks the field and shows the message under it
  stepper?: StepRange | undefined; // −/+ buttons, and the arrow keys step too
  value: string;
  onChange: (text: string) => void;
}

// The ids of a field's hint and error, for aria-describedby.
const describedBy = (id: string, hint?: string, error?: string) =>
  [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;

function FieldError({ id, error }: { id: string; error?: string | undefined }) {
  return error ? (
    <small id={`${id}-error`} className="field-error">
      {error}
    </small>
  ) : null;
}

export function Field({ id, label, hint, aside, invalid, error, stepper, value, onChange, ...inputProps }: FieldProps) {
  const step = (direction: 1 | -1) => {
    if (stepper) onChange(stepText(value, direction, stepper));
  };
  const input = (
    <input
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={
        stepper
          ? (e) => {
              if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
              e.preventDefault();
              step(e.key === "ArrowUp" ? 1 : -1);
            }
          : undefined
      }
      aria-invalid={invalid || !!error || undefined}
      aria-describedby={describedBy(id, hint, error)}
      {...inputProps}
    />
  );
  return (
    <div className="field">
      {aside ? (
        <div className="field-head">
          <label htmlFor={id}>{label}</label>
          {aside}
        </div>
      ) : (
        <label htmlFor={id}>{label}</label>
      )}
      {stepper ? (
        <div className="stepper">
          <button type="button" aria-label={`Decrease ${label}`} onClick={() => step(-1)}>
            −
          </button>
          {input}
          <button type="button" aria-label={`Increase ${label}`} onClick={() => step(1)}>
            +
          </button>
        </div>
      ) : (
        input
      )}
      <FieldError id={id} error={error} />
      {hint && (
        <small id={`${id}-hint`} className="hint">
          {hint}
        </small>
      )}
    </div>
  );
}

interface SelectFieldProps {
  id: string;
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  options: { value: number | string; label: string }[];
  value: string;
  onChange: (text: string) => void;
}

export function SelectField({ id, label, hint, error, options, value, onChange }: SelectFieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy(id, hint, error)}
      >
        {options.map((o) => (
          <option key={o.value} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
      <FieldError id={id} error={error} />
      {hint && (
        <small id={`${id}-hint`} className="hint">
          {hint}
        </small>
      )}
    </div>
  );
}

// A few short options as a row of buttons (radio buttons underneath, so the
// arrow keys move between them), all in view instead of in a list.
export function ButtonsField({
  id,
  label,
  hint,
  error,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="field buttons-field" aria-describedby={describedBy(id, hint, error)}>
      <legend>{label}</legend>
      <div className="segmented">
        {options.map((o) => (
          <label key={o.value}>
            <input type="radio" name={id} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      <FieldError id={id} error={error} />
      {hint && (
        <small id={`${id}-hint`} className="hint">
          {hint}
        </small>
      )}
    </fieldset>
  );
}

// Text fields, so a decimal comma can be typed and the −/+ buttons replace the
// browser's tiny arrows; the keyboard on phones still shows numbers.
const paramInputProps = (p: NumberParamDef): Pick<InputHTMLAttributes<HTMLInputElement>, "type" | "inputMode"> => ({
  type: "text",
  inputMode: p.type === "int" ? "numeric" : "decimal",
});

// −/+ buttons for parameters with a step (hole counts, axle length in half studs).
const stepperOf = (p: NumberParamDef): StepRange | undefined =>
  p.step ? { step: p.step, min: p.min, max: p.max, fallback: p.default } : undefined;

// A part's quick picks: each sets some parameters. The one the form matches is
// shown as pressed.
function Presets({
  partId,
  presets,
  text,
  onChange,
}: {
  partId: string;
  presets: NonNullable<PartDefinition["presets"]>;
  text: ParamText;
  onChange: (key: string, text: string) => void;
}) {
  const matches = (params: Record<string, number>) =>
    Object.entries(params).every(([key, value]) => parseNumber(text[key] ?? "") === value);
  return (
    <div className="presets" role="group" aria-labelledby={`presets-${partId}`}>
      <span id={`presets-${partId}`} className="presets-label">
        {presets.label}
      </span>
      <div className="presets-row">
        {presets.options.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="preset"
            aria-pressed={matches(preset.params)}
            onClick={() => Object.entries(preset.params).forEach(([key, value]) => onChange(key, String(value)))}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// A part's parameter fields, generated from its definition, after its quick picks.
// `error` is shown under the parameter it names.
export function ParamFields({
  part,
  text,
  error,
  onChange,
}: {
  part: PartDefinition;
  text: ParamText;
  error?: { key: string; message: string } | null;
  onChange: (key: string, text: string) => void;
}) {
  const errorOf = (key: string) => (error?.key === key ? error.message : undefined);
  const fields = part.params.map((p) =>
    p.type === "choice" && p.buttons ? (
      <ButtonsField
        key={`${part.id}-${p.key}`}
        id={`param-${p.key}`}
        label={p.label}
        hint={p.hint}
        options={p.options.map((o) => ({ value: String(o.value), label: o.label }))}
        error={errorOf(p.key)}
        value={text[p.key] ?? ""}
        onChange={(t) => onChange(p.key, t)}
      />
    ) : p.type === "choice" ? (
      <SelectField
        key={`${part.id}-${p.key}`}
        id={`param-${p.key}`}
        label={p.label}
        hint={p.hint}
        error={errorOf(p.key)}
        options={p.options}
        value={text[p.key] ?? ""}
        onChange={(t) => onChange(p.key, t)}
      />
    ) : (
      <Field
        key={`${part.id}-${p.key}`}
        id={`param-${p.key}`}
        label={p.label}
        hint={p.hint}
        error={errorOf(p.key)}
        stepper={stepperOf(p)}
        value={text[p.key] ?? ""}
        onChange={(t) => onChange(p.key, t)}
        {...paramInputProps(p)}
      />
    ),
  );
  return (
    <>
      {part.presets && <Presets partId={part.id} presets={part.presets} text={text} onChange={onChange} />}
      {fields}
    </>
  );
}
