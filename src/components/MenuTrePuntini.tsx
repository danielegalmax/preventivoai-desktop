import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type VoceMenuAzione = {
  label: string;
  onClick: () => void;
  danger?: boolean;
  hidden?: boolean;
};

type Props = {
  voci: VoceMenuAzione[];
  ariaLabel?: string;
  triggerClassName?: string;
  disabled?: boolean;
};

const MENU_MIN_W = 152;
const DEFAULT_TRIGGER =
  "inline-flex shrink-0 rounded px-1.5 py-0.5 text-lg leading-none text-brand-navy/50 hover:bg-brand-bg hover:text-brand-navy";

export default function MenuTrePuntini({ voci, ariaLabel = "Altre azioni", triggerClassName, disabled = false }: Props) {
  const [aperto, setAperto] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const visibili = voci.filter((v) => !v.hidden);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!aperto || !btnRef.current) {
      setCoords(null);
      return;
    }

    function aggiornaPosizione() {
      const btn = btnRef.current;
      const menu = menuRef.current;
      if (!btn) return;

      const rect = btn.getBoundingClientRect();
      const menuW = menu?.offsetWidth ?? MENU_MIN_W;
      const menuH = menu?.offsetHeight ?? visibili.length * 40 + 8;

      let top = rect.bottom + 4;
      let left = rect.right - menuW;
      if (left < 8) left = 8;
      if (top + menuH > window.innerHeight - 8) top = Math.max(8, rect.top - menuH - 4);

      setCoords({ top, left });
    }

    aggiornaPosizione();
    window.addEventListener("resize", aggiornaPosizione);
    window.addEventListener("scroll", aggiornaPosizione, true);
    return () => {
      window.removeEventListener("resize", aggiornaPosizione);
      window.removeEventListener("scroll", aggiornaPosizione, true);
    };
  }, [aperto, visibili.length]);

  useEffect(() => {
    if (!aperto) return;
    function chiudi(e: MouseEvent) {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setAperto(false);
    }
    document.addEventListener("mousedown", chiudi);
    return () => document.removeEventListener("mousedown", chiudi);
  }, [aperto]);

  if (visibili.length === 0 || disabled) return null;

  const menu = aperto && coords ? (
    <div
      ref={menuRef}
      style={{ position: "fixed", top: coords.top, left: coords.left, zIndex: 9999 }}
      className="min-w-[9.5rem] rounded-lg border border-black/10 bg-white py-1 shadow-lg"
      data-no-expand
    >
      {visibili.map((v) => (
        <button
          key={v.label}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setAperto(false);
            v.onClick();
          }}
          className={`block w-full px-3 py-2 text-left text-sm ${
            v.danger ? "text-red-600 hover:bg-red-50" : "text-brand-navy hover:bg-brand-bg"
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setAperto((v) => !v);
        }}
        className={triggerClassName ?? DEFAULT_TRIGGER}
        aria-label={ariaLabel}
        aria-expanded={aperto}
        data-no-expand
      >
        ⋮
      </button>
      {typeof document !== "undefined" && menu ? createPortal(menu, document.body) : null}
    </>
  );
}
