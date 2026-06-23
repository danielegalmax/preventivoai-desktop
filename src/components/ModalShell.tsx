import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from "react";

const BACKDROP_CLICK_MAX_DELTA_PX = 5;

export function hasActiveTextSelection(): boolean {
  const selection = window.getSelection();
  return Boolean(selection && selection.toString().length > 0);
}

/** Evita chiusura accidentale del modal durante selezione testo o drag dal contenuto. */
export function useModalBackdropClose(onClose: () => void) {
  const mouseDownTargetRef = useRef<EventTarget | null>(null);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  function handleBackdropMouseDown(e: MouseEvent<HTMLDivElement>) {
    if (hasActiveTextSelection()) {
      e.preventDefault();
      return;
    }
    mouseDownTargetRef.current = e.target;
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
  }

  function handleBackdropMouseUp(e: MouseEvent<HTMLDivElement>) {
    const backdrop = e.currentTarget;
    const mouseDownTarget = mouseDownTargetRef.current;
    const mouseDownPos = mouseDownPosRef.current;
    mouseDownTargetRef.current = null;
    mouseDownPosRef.current = null;

    if (e.target !== backdrop || mouseDownTarget !== backdrop) return;
    if (hasActiveTextSelection()) return;

    if (mouseDownPos) {
      const dx = e.clientX - mouseDownPos.x;
      const dy = e.clientY - mouseDownPos.y;
      if (Math.hypot(dx, dy) >= BACKDROP_CLICK_MAX_DELTA_PX) return;
    }

    onClose();
  }

  return { handleBackdropMouseDown, handleBackdropMouseUp };
}

type ModalStackEntry = {
  onClose: () => void;
  onConfirm?: () => void;
};

const modalStack: ModalStackEntry[] = [];
let keydownListenerAttached = false;

function shouldSkipEnterConfirm(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.tagName === "TEXTAREA") return true;
  if (target.tagName === "BUTTON") return true;
  if (target.tagName === "SELECT") return true;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLInputElement) {
    const type = target.type.toLowerCase();
    if (type === "checkbox" || type === "radio") return true;
  }
  return false;
}

function onDocumentKeyDown(e: KeyboardEvent) {
  if (modalStack.length === 0) return;
  const top = modalStack[modalStack.length - 1];

  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    top.onClose();
    return;
  }

  if (e.key !== "Enter" || !top.onConfirm || e.isComposing || e.shiftKey) return;
  if (shouldSkipEnterConfirm(e.target)) return;

  e.preventDefault();
  e.stopPropagation();
  top.onConfirm();
}

function attachKeydownListener() {
  if (keydownListenerAttached) return;
  document.addEventListener("keydown", onDocumentKeyDown, true);
  keydownListenerAttached = true;
}

function detachKeydownListenerIfIdle() {
  if (modalStack.length > 0 || !keydownListenerAttached) return;
  document.removeEventListener("keydown", onDocumentKeyDown, true);
  keydownListenerAttached = false;
}

/** True se almeno un modal nello stack è attivo (priorità Escape vs selezione multipla). */
export function isAppModalOpen() {
  return modalStack.length > 0;
}

/** Registra Escape (e opz. Invio→onConfirm) nello stack condiviso con ModalShell. */
export function useAppModalKeyboard(
  onClose: () => void,
  options?: { onConfirm?: () => void; enabled?: boolean },
) {
  const enabled = options?.enabled ?? true;
  const onConfirm = options?.onConfirm;

  useEffect(() => {
    if (!enabled) return;
    const entry: ModalStackEntry = { onClose, onConfirm };
    modalStack.push(entry);
    attachKeydownListener();
    return () => {
      const index = modalStack.lastIndexOf(entry);
      if (index >= 0) modalStack.splice(index, 1);
      detachKeydownListenerIfIdle();
    };
  }, [onClose, onConfirm, enabled]);
}

type Props = {
  title?: string;
  titleId?: string;
  onClose: () => void;
  onConfirm?: () => void;
  onBackdropClick?: () => void;
  children: ReactNode;
  zClass?: string;
  panelClassName?: string;
  contentClassName?: string;
};

export default function ModalShell({
  title,
  titleId: titleIdProp,
  onClose,
  onConfirm,
  onBackdropClick,
  children,
  zClass = "z-50",
  panelClassName = "max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-lg",
  contentClassName = "mt-4 space-y-4",
}: Props) {
  const generatedTitleId = useId();
  const titleId = titleIdProp ?? (title ? generatedTitleId : undefined);
  const backdropClose = onBackdropClick ?? onClose;
  const { handleBackdropMouseDown, handleBackdropMouseUp } = useModalBackdropClose(backdropClose);

  useAppModalKeyboard(onClose, { onConfirm });

  return (
    <div
      className={`fixed inset-0 ${zClass} flex items-center justify-center bg-black/40 p-4`}
      data-app-modal
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
    >
      <div
        className={panelClassName}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        {title ? (
          <h2 id={titleId} className="text-center text-lg font-semibold text-brand-navy">
            {title}
          </h2>
        ) : null}
        <div className={title ? contentClassName : undefined}>{children}</div>
      </div>
    </div>
  );
}
