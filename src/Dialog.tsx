import { useEffect, useId, useRef, type ReactNode } from "react";

// A modal <dialog> with a title and a Close button. `open` drives it; Escape
// closes it too, and either way onClose is called. It isn't called when `open`
// turns false: the browser fires that close event a moment later, by which time
// the page may have opened the dialog again (Back pressed quickly after it).
export default function Dialog({
  open,
  onClose,
  title,
  label,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string; // shown in the bar
  label?: string; // the dialog's name for screen readers when it has no title
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`dialog${className ? ` ${className}` : ""}`}
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : label}
      onClose={(e) => {
        if (open && !e.currentTarget.open) onClose();
      }}
    >
      <div className="dialog-bar">
        {title && <h2 id={titleId}>{title}</h2>}
        <button type="button" className="button secondary" onClick={onClose}>
          Close
        </button>
      </div>
      {children}
    </dialog>
  );
}
