import { useState, type ChangeEvent, type RefObject } from "react";
import { CATEGORIE } from "../../lib/settingsConstants";
import type { SettingsForm } from "../../lib/settings";
import { PLACEHOLDER } from "../../lib/placeholders";

type SubTab = "logo" | "dati" | "firma" | "categoria";

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "logo", label: "Logo" },
  { id: "dati", label: "Dati" },
  { id: "firma", label: "Firma" },
  { id: "categoria", label: "Categoria" },
];

type Props = {
  form: SettingsForm;
  logoUrl: string;
  logoCacheKey: number;
  uploadingLogo: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onLogoChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onFieldChange: <K extends keyof SettingsForm>(campo: K, valore: SettingsForm[K]) => void;
};

export default function SettingsIdentitaSection({
  form,
  logoUrl,
  logoCacheKey,
  uploadingLogo,
  fileInputRef,
  onLogoChange,
  onFieldChange,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [subTab, setSubTab] = useState<SubTab>("logo");

  return (
    <div className="rounded-2xl border border-black/10 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-brand-bg/40"
      >
        <span className="text-sm font-semibold text-brand-navy">Identità azienda</span>
        <span className="text-brand-navy/40">{expanded ? "▾" : "▸"}</span>
      </button>

      {expanded && (
        <>
          <div className="flex border-b border-black/5 px-2">
            {SUB_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id)}
                className={`flex-1 py-2.5 text-xs font-medium capitalize ${
                  subTab === tab.id
                    ? "border-b-2 border-brand-teal text-brand-teal"
                    : "text-brand-navy/50 hover:text-brand-navy"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-4 p-4">
            {subTab === "logo" && (
              <>
                <p className="text-xs text-brand-navy/50">Apparirà sui preventivi PDF. Max 500KB.</p>
                {logoUrl ? (
                  <img
                    src={`${logoUrl}?v=${logoCacheKey}`}
                    alt="Logo"
                    className="h-20 w-full rounded-lg border border-black/10 bg-brand-bg object-contain p-2"
                  />
                ) : (
                  <div className="flex h-20 w-full items-center justify-center rounded-lg border border-dashed border-black/10 bg-brand-bg text-sm text-brand-navy/40">
                    Nessun logo caricato
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onLogoChange} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {uploadingLogo ? "Caricamento..." : logoUrl ? "Cambia logo" : "Carica logo"}
                </button>
              </>
            )}

            {subTab === "dati" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-sm text-brand-navy/70">Nome azienda</label>
                  <input
                    value={form.nome_azienda}
                    onChange={(e) => onFieldChange("nome_azienda", e.target.value)}
                    placeholder={PLACEHOLDER.nomeAzienda}
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-brand-navy/70">Città</label>
                  <input
                    value={form.citta}
                    onChange={(e) => onFieldChange("citta", e.target.value)}
                    placeholder={PLACEHOLDER.citta}
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-brand-navy/70">Partita IVA</label>
                  <input
                    value={form.piva}
                    onChange={(e) => onFieldChange("piva", e.target.value)}
                    placeholder={PLACEHOLDER.piva}
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-sm text-brand-navy/70">Telefono</label>
                  <input
                    value={form.telefono}
                    onChange={(e) => onFieldChange("telefono", e.target.value)}
                    placeholder={PLACEHOLDER.telefono}
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
                  />
                </div>
              </div>
            )}

            {subTab === "firma" && (
              <div className="space-y-1">
                <label className="text-sm text-brand-navy/70">Firma (nome in corsivo nel PDF)</label>
                <input
                  value={form.firma_nome}
                  onChange={(e) => onFieldChange("firma_nome", e.target.value)}
                  placeholder={PLACEHOLDER.firma}
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
                />
              </div>
            )}

            {subTab === "categoria" && (
              <div className="space-y-1">
                <label className="text-sm text-brand-navy/70">Categoria</label>
                <select
                  value={form.categoria}
                  onChange={(e) => onFieldChange("categoria", e.target.value)}
                  className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm capitalize outline-none focus:border-brand-teal"
                >
                  {CATEGORIE.map((c) => (
                    <option key={c} value={c} className="capitalize">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
