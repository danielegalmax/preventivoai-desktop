import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  caricaSettingsData,
  salvaProfiloSettings,
  sessionToken,
  uploadLogoSettings,
} from "../lib/settings";
import type { SettingsForm } from "../lib/settings";
import PageContainer from "../components/PageContainer";
import SettingsNavLink, { SETTINGS_NAV_ICONS } from "../components/settings/SettingsNavLink";
import SettingsIdentitaSection from "../components/settings/SettingsIdentitaSection";
import BrandColorPicker from "../components/settings/BrandColorPicker";
import { TONI } from "../lib/settingsConstants";
import { MESSAGGI_CLIENTE_DEFAULT } from "preventivoai-shared";

const FORM_VUOTO: SettingsForm = {
  nome_azienda: "",
  categoria: "videomaker",
  citta: "",
  piva: "",
  telefono: "",
  tono: "professionale e diretto",
  colore_brand: "0D1B2A",
  note_pagamento: "",
  firma_nome: "",
  reminder_firma_giorni: 3,
  reminder_firma_globale_disabilitato: false,
  messaggi: MESSAGGI_CLIENTE_DEFAULT,
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      if (!base64) reject(new Error("Impossibile leggere l'immagine"));
      else resolve(base64);
    };
    reader.onerror = () => reject(new Error("Impossibile leggere l'immagine"));
    reader.readAsDataURL(file);
  });
}

export default function Impostazioni() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<SettingsForm>(FORM_VUOTO);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoCacheKey, setLogoCacheKey] = useState(0);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [messaggio, setMessaggio] = useState("");
  const [errore, setErrore] = useState("");
  const [coloreExpanded, setColoreExpanded] = useState(false);
  const [noteExpanded, setNoteExpanded] = useState(false);

  useEffect(() => {
    Promise.all([caricaSettingsData(), sessionToken()]).then(([data, accessToken]) => {
      if (data) {
        setForm(data.form);
        setLogoUrl(data.logoUrl);
        if (data.logoUrl) setLogoCacheKey(Date.now());
      }
      setToken(accessToken);
      setLoading(false);
    });
  }, []);

  function aggiorna<K extends keyof SettingsForm>(campo: K, valore: SettingsForm[K]) {
    setForm((f) => ({ ...f, [campo]: valore }));
  }

  async function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrore("Seleziona un file immagine.");
      e.target.value = "";
      return;
    }

    const sizeKB = file.size / 1024;
    if (sizeKB > 500) {
      setErrore("Immagine troppo grande. Max 500KB.");
      e.target.value = "";
      return;
    }

    setUploadingLogo(true);
    setErrore("");
    setMessaggio("");
    try {
      const logoBase64 = await fileToBase64(file);
      const nuovoLogoUrl = await uploadLogoSettings({
        logoBase64,
        mimeType: file.type || "image/png",
        token,
      });
      setLogoUrl(nuovoLogoUrl);
      setLogoCacheKey(Date.now());
      setMessaggio("Logo caricato. Apparirà sui preventivi PDF.");
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore caricamento logo");
    }
    setUploadingLogo(false);
    e.target.value = "";
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setMessaggio("");
    setErrore("");
    const { error } = await salvaProfiloSettings(form);
    setSalvando(false);
    if (error) {
      setErrore(error.message);
      return;
    }
    setMessaggio("Salvato.");
  }

  if (loading) {
    return (
      <PageContainer>
        <p className="text-brand-navy/60">Caricamento...</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <h1 className="text-2xl font-semibold text-brand-navy">Impostazioni</h1>
      <p className="mt-1 text-brand-navy/60">Dati azienda usati nei preventivi.</p>

      <form onSubmit={handleSubmit} className="mt-6 w-full space-y-3">
        <SettingsIdentitaSection
          form={form}
          logoUrl={logoUrl}
          logoCacheKey={logoCacheKey}
          uploadingLogo={uploadingLogo}
          fileInputRef={fileInputRef}
          onLogoChange={handleLogoChange}
          onFieldChange={aggiorna}
        />

        <BrandColorPicker
          value={form.colore_brand}
          onChange={(v) => aggiorna("colore_brand", v)}
          expanded={coloreExpanded}
          onToggle={() => setColoreExpanded((v) => !v)}
        />

        <div className="rounded-2xl border border-black/10 bg-white px-4 py-3.5 shadow-sm">
          <label className="mb-2 block text-sm font-semibold text-brand-navy">Tono di comunicazione</label>
          <select
            value={form.tono}
            onChange={(e) => aggiorna("tono", e.target.value)}
            className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-brand-teal"
          >
            {TONI.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setNoteExpanded((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-brand-bg/40"
          >
            <span className="text-sm font-semibold text-brand-navy">Note di pagamento</span>
            <span className="text-brand-navy/40">{noteExpanded ? "▾" : "▸"}</span>
          </button>
          {!noteExpanded && (
            <p className="px-4 pb-3.5 text-xs text-brand-navy/50 line-clamp-2">
              {form.note_pagamento.trim() || "Nessuna nota impostata"}
            </p>
          )}
          {noteExpanded && (
            <div className="space-y-2 border-t border-black/5 px-4 py-4">
              <p className="text-xs text-brand-navy/50">Appare in fondo a tutti i preventivi PDF</p>
              <textarea
                value={form.note_pagamento}
                onChange={(e) => aggiorna("note_pagamento", e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
              />
            </div>
          )}
        </div>

        <SettingsNavLink
          to="/impostazioni/servizi"
          title="I miei servizi"
          subtitle="Il tuo listino prezzi per i preventivi"
          icon={SETTINGS_NAV_ICONS.servizi}
        />

        <SettingsNavLink
          to="/impostazioni/pagamenti"
          title="Metodi di pagamento"
          subtitle="Bonifico, PayPal, contanti, carta e Stripe"
          icon={SETTINGS_NAV_ICONS.pagamenti}
        />

        <SettingsNavLink
          to="/impostazioni/fiscale"
          title="Regime fiscale"
          subtitle="Analisi fiscale e calcolo del netto nel builder"
          icon={SETTINGS_NAV_ICONS.fiscale}
        />

        <SettingsNavLink
          to="/impostazioni/messaggi"
          title="Comunicazione cliente"
          subtitle="Messaggi, link firma digitale e reminder"
          icon={SETTINGS_NAV_ICONS.messaggi}
        />

        {errore && <p className="text-sm text-red-600">{errore}</p>}
        {messaggio && <p className="text-sm text-brand-teal">{messaggio}</p>}

        <button
          type="submit"
          disabled={salvando}
          className="w-full rounded-xl bg-brand-teal py-3.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {salvando ? "Salvataggio..." : "Salva"}
        </button>
      </form>
    </PageContainer>
  );
}
