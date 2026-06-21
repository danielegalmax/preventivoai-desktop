import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import {
  creaChipElement,
  inserisciVariabileAtIndex,
  popolaEditorMessaggio,
  proteggiModificaMessaggio,
  serializzaMessaggioEditor,
  tokenVariabileMessaggio,
  variabileBloccataInTemplate,
  type TipoMessaggioCliente,
} from "preventivoai-shared";

type Props = {
  tipo: TipoMessaggioCliente;
  value: string;
  onChange: (value: string) => void;
  variabili: string[];
};

function isChipNode(node: Node | null | undefined): node is HTMLElement {
  return !!node && node.nodeType === Node.ELEMENT_NODE && !!(node as HTMLElement).dataset.var;
}

function lineBlock(node: Node, editor: HTMLElement): HTMLElement {
  let current: Node | null = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
  while (current && current !== editor) {
    if (current.parentNode === editor && current.nodeType === Node.ELEMENT_NODE) {
      return current as HTMLElement;
    }
    current = current.parentNode;
  }
  return editor;
}

function fragmentHasSignificantContent(fragment: DocumentFragment): boolean {
  const temp = document.createElement("div");
  temp.appendChild(fragment);
  if (temp.querySelector("[data-var]")) return true;
  return Boolean(temp.textContent?.replace(/\u200B/g, "").trim());
}

function isAtBlockStart(range: Range, block: HTMLElement): boolean {
  const probe = range.cloneRange();
  probe.selectNodeContents(block);
  probe.setEnd(range.startContainer, range.startOffset);
  return !fragmentHasSignificantContent(probe.cloneContents());
}

function isAtBlockEnd(range: Range, block: HTMLElement): boolean {
  const probe = range.cloneRange();
  probe.selectNodeContents(block);
  probe.setStart(range.startContainer, range.startOffset);
  return !fragmentHasSignificantContent(probe.cloneContents());
}

function blockHasContent(block: HTMLElement): boolean {
  const temp = document.createElement("div");
  temp.appendChild(block.cloneNode(true));
  if (temp.querySelector("[data-var]")) return true;
  return Boolean(temp.textContent?.replace(/\u200B/g, "").trim());
}

function previousLineBlock(block: HTMLElement, editor: HTMLElement): HTMLElement | null {
  if (block === editor) return null;
  let prev: Node | null = block.previousSibling;
  while (prev) {
    if (prev.nodeType === Node.ELEMENT_NODE) {
      const el = prev as HTMLElement;
      if (blockHasContent(el)) return el;
    }
    prev = prev.previousSibling;
  }
  return null;
}

function nextLineBlock(block: HTMLElement, editor: HTMLElement): HTMLElement | null {
  if (block === editor) return null;
  let next: Node | null = block.nextSibling;
  while (next) {
    if (next.nodeType === Node.ELEMENT_NODE) {
      const el = next as HTMLElement;
      if (blockHasContent(el)) return el;
    }
    next = next.nextSibling;
  }
  return null;
}

function findChipAtEnd(node: Node): HTMLElement | null {
  if (isChipNode(node)) return node;
  if (node.nodeType === Node.TEXT_NODE) return null;
  if (node.nodeName === "BR") return null;
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    for (let i = el.childNodes.length - 1; i >= 0; i--) {
      const child = el.childNodes[i];
      if (child.nodeType === Node.TEXT_NODE && (child.textContent ?? "").replace(/\u200B/g, "").length) {
        return null;
      }
      const chip = findChipAtEnd(child);
      if (chip) return chip;
    }
  }
  return null;
}

function findChipAtStart(node: Node): HTMLElement | null {
  if (isChipNode(node)) return node;
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? "").replace(/\u200B/g, "").length ? null : null;
  }
  if (node.nodeName === "BR") return null;
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    for (let i = 0; i < el.childNodes.length; i++) {
      const child = el.childNodes[i];
      if (child.nodeType === Node.TEXT_NODE && (child.textContent ?? "").replace(/\u200B/g, "").length) {
        return null;
      }
      const chip = findChipAtStart(child);
      if (chip) return chip;
    }
  }
  return null;
}

function chipAtBlockEnd(block: HTMLElement): HTMLElement | null {
  for (let i = block.childNodes.length - 1; i >= 0; i--) {
    const child = block.childNodes[i];
    if (child.nodeType === Node.TEXT_NODE && (child.textContent ?? "").replace(/\u200B/g, "").length) {
      return null;
    }
    if (isChipNode(child)) return child;
    if (child.nodeName === "BR") continue;
    const chip = findChipAtEnd(child);
    if (chip) return chip;
  }
  return null;
}

function chipAtBlockStart(block: HTMLElement): HTMLElement | null {
  for (let i = 0; i < block.childNodes.length; i++) {
    const child = block.childNodes[i];
    if (child.nodeType === Node.TEXT_NODE && (child.textContent ?? "").replace(/\u200B/g, "").length) {
      return null;
    }
    if (isChipNode(child)) return child;
    if (child.nodeName === "BR") continue;
    if (child.nodeType === Node.ELEMENT_NODE) {
      const chip = findChipAtStart(child);
      if (chip) return chip;
    }
  }
  return null;
}

function chipAdiacenteSibling(range: Range, direction: "before" | "after"): HTMLElement | null {
  const { startContainer, startOffset } = range;
  if (!range.collapsed) return null;

  if (startContainer.nodeType === Node.TEXT_NODE) {
    const text = startContainer.textContent ?? "";
    if (direction === "before" && startOffset === 0) {
      const prev = startContainer.previousSibling;
      if (isChipNode(prev)) return prev;
    }
    if (direction === "after" && startOffset === text.length) {
      const next = startContainer.nextSibling;
      if (isChipNode(next)) return next;
    }
    return null;
  }

  if (startContainer.nodeType === Node.ELEMENT_NODE) {
    const el = startContainer as HTMLElement;
    const index = direction === "before" ? startOffset - 1 : startOffset;
    const sibling = el.childNodes[index];
    if (isChipNode(sibling)) return sibling;
  }

  return null;
}

function chipAdiacente(range: Range, direction: "before" | "after", editor: HTMLElement): HTMLElement | null {
  const direct = chipAdiacenteSibling(range, direction);
  if (direct) return direct;

  const block = lineBlock(range.startContainer, editor);
  if (block === editor) return null;

  const atEdge = direction === "before"
    ? isAtBlockStart(range, block)
    : isAtBlockEnd(range, block);
  if (!atEdge) return null;

  const siblingBlock = direction === "before"
    ? previousLineBlock(block, editor)
    : nextLineBlock(block, editor);
  if (!siblingBlock) return null;

  return direction === "before"
    ? chipAtBlockEnd(siblingBlock)
    : chipAtBlockStart(siblingBlock);
}

function normalizzaNomeVariabile(varName: string) {
  return varName.replace(/^\{|\}$/g, "");
}

export default function MessaggioMultilineChipEditor({ tipo, value, onChange, variabili }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const internalValueRef = useRef<string | null>(null);
  const lastValueRef = useRef(value);

  const commitEditorContent = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const raw = serializzaMessaggioEditor(editor);
    const next = proteggiModificaMessaggio(lastValueRef.current, raw, variabili, tipo);
    if (next !== raw) {
      popolaEditorMessaggio(editor, next, variabili, tipo);
    }
    internalValueRef.current = next;
    lastValueRef.current = next;
    onChange(next);
  }, [onChange, tipo, variabili]);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    popolaEditorMessaggio(editor, value, variabili, tipo);
    lastValueRef.current = value;
  }, []);

  useEffect(() => {
    if (internalValueRef.current === value) {
      internalValueRef.current = null;
      lastValueRef.current = value;
      return;
    }
    const editor = editorRef.current;
    if (!editor || value === lastValueRef.current) return;
    popolaEditorMessaggio(editor, value, variabili, tipo);
    lastValueRef.current = value;
  }, [value, variabili, tipo]);

  function saveSelection() {
    const editor = editorRef.current;
    const sel = window.getSelection();
    if (!editor || !sel?.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  }

  function restoreSelection() {
    const sel = window.getSelection();
    const range = savedRangeRef.current;
    if (!sel || !range) return false;
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  }

  function posizioneInserimentoFallback(): number {
    const editor = editorRef.current;
    const sel = window.getSelection();
    if (editor && sel?.rangeCount) {
      const range = sel.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        const pre = document.createRange();
        pre.selectNodeContents(editor);
        pre.setEnd(range.startContainer, range.startOffset);
        const temp = document.createElement("div");
        temp.appendChild(pre.cloneContents());
        return serializzaMessaggioEditor(temp).length;
      }
    }
    return value.length;
  }

  function inserisci(varName: string) {
    const token = tokenVariabileMessaggio(varName);
    if (value.includes(token)) return;

    const editor = editorRef.current;
    if (!editor) {
      onChange(inserisciVariabileAtIndex(value, varName, value.length, variabili));
      return;
    }

    editor.focus();
    const sel = window.getSelection();
    const hadSaved = restoreSelection() || (sel?.rangeCount && editor.contains(sel.anchorNode));

    if (!hadSaved || !sel?.rangeCount) {
      onChange(inserisciVariabileAtIndex(value, varName, posizioneInserimentoFallback(), variabili));
      return;
    }

    const range = sel.getRangeAt(0);
    range.deleteContents();
    const nome = normalizzaNomeVariabile(varName);
    const locked =
      variabileBloccataInTemplate(value, tipo, nome)
      || (nome === "url" && (tipo === "firma_invio" || tipo === "firma_reminder"));
    const chip = creaChipElement(nome, locked);
    range.insertNode(chip);
    range.setStartAfter(chip);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    savedRangeRef.current = range.cloneRange();
    commitEditorContent();
  }

  function rimuoviChip(chip: HTMLElement) {
    if (chip.dataset.locked === "true") return;
    const editor = editorRef.current;
    if (!editor) return;
    const parent = chip.parentNode;
    chip.remove();
    if (parent) {
      const sel = window.getSelection();
      const range = document.createRange();
      range.setStart(parent, Math.min(parent.childNodes.length, Array.from(parent.childNodes).length));
      range.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(range);
      savedRangeRef.current = range.cloneRange();
    }
    commitEditorContent();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Backspace" && e.key !== "Delete") return;
    const editor = editorRef.current;
    const sel = window.getSelection();
    if (!editor || !sel?.rangeCount || !sel.isCollapsed) return;

    const range = sel.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;

    const direction = e.key === "Backspace" ? "before" : "after";
    const chip = chipAdiacente(range, direction, editor);
    if (!chip) return;

    e.preventDefault();
    rimuoviChip(chip);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    commitEditorContent();
  }

  const disponibili = variabili.filter((v) => !value.includes(v));

  return (
    <div className="space-y-2">
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        onInput={() => commitEditorContent()}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        onBlur={saveSelection}
        className="min-h-[9rem] w-full whitespace-pre-wrap rounded-lg border border-black/10 px-3 py-2 text-sm leading-relaxed outline-none focus:border-brand-teal"
      />

      {disponibili.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-navy/40">
            Inserisci
          </span>
          {disponibili.map((v) => (
            <button
              key={v}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => inserisci(v)}
              className="rounded-md border border-black/10 bg-white px-2 py-0.5 text-xs font-semibold text-brand-teal hover:bg-brand-bg"
            >
              {v}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
