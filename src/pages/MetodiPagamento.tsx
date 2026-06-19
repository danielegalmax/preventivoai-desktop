import { useEffect, useState } from "react";
import { Link } from "react-router";
import PageContainer from "../components/PageContainer";
import { PLACEHOLDER } from "../lib/placeholders";
import {
  caricaMetodiPagamento,
  eliminaMetodoPagamento,
  iconaMetodoPagamento,
  salvaMetodoPagamento,
  type MetodoPagamento,
  type MetodoPagamentoForm,
  type TipoPagamento,
} from "../lib/pagamenti";

const FORM_VUOTO: MetodoPagamentoForm = {
  tipo: "bonifico",
  nome: "",
  dati: {},
  predefinito: false,
};

const TIPI: { key: TipoPagamento; label: string }[] = [
  { key: "bonifico", label: "Bonifico" },
  { key: "paypal", label: "PayPal" },
  { key: "contanti", label: "Contanti" },
  { key: "carta", label: "Carta" },
  { key: "stripe", label: "Stripe link" },
];

export default function MetodiPagamento() {
  const [metodi, setMetodi] = useState<MetodoPagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAperto, setModalAperto] = useState(false);
  const [edit, setEdit] = useState<MetodoPagamento | null>(null);
  const [form, setForm] = useState<MetodoPagamentoForm>(FORM_VUOTO);
  const [saving, setSaving] = useState(false);
  const [errore, setErrore] = useState("");

  async function carica() {
    const data = await caricaMetodiPagamento();
    setMetodi(data);
    setLoading(false);
  }

  useEffect(() => {
    carica();
  }, []);

  function apriNuovo() {
    setEdit(null);
    setForm(FORM_VUOTO);
    setErrore("");
    setModalAperto(true);
  }

  function apriModifica(m: MetodoPagamento) {
    setEdit(m);
    setForm({ tipo: m.tipo, nome: m.nome, dati: m.dati || {}, predefinito: !!m.predefinito });
    setErrore("");
    setModalAperto(true);
  }

  async function salva() {
    if (!form.nome.trim()) {
      setErrore("Inserisci un nome");
      return;
    }
    setSaving(true);
    setErrore("");
    const { error } = await salvaMetodoPagamento(form, edit?.id);
    setSaving(false);
    if (error) {
      setErrore(error.message);
      return;
    }
    setModalAperto(false);
    carica();
  }

  async function elimina(id: string) {
    if (!window.confirm("Vuoi eliminare questo metodo?")) return;
    const { error } = await eliminaMetodoPagamento(id);
    if (error) {
      window.alert(error.message);
      return;
    }
    setMetodi((m) => m.filter((x) => x.id !== id));
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
      <Link to="/impostazioni" className="text-sm text-brand-navy/60 hover:text-brand-navy">
        ← Impostazioni
      </Link>
      <div className="mt-2 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-navy">Metodi di pagamento</h1>
          <p className="mt-1 text-brand-navy/60">Bonifico, PayPal, contanti, carta o Stripe</p>
        </div>
        <button
          type="button"
          onClick={apriNuovo}
          className="rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white"
        >
          + Nuovo
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {metodi.length === 0 ? (
          <button
            type="button"
            onClick={apriNuovo}
            className="w-full rounded-2xl border border-dashed border-black/10 bg-white p-8 text-center shadow-sm hover:bg-brand-bg/40"
          >
            <p className="text-base font-semibold text-brand-navy">Nessun metodo configurato</p>
            <p className="mt-1 text-sm text-brand-navy/50">
              Aggiungi bonifico, PayPal, contanti, carta o Stripe
            </p>
          </button>
        ) : (
          metodi.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm"
            >
              <span className="text-2xl">{iconaMetodoPagamento(m.tipo)}</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-brand-navy">{m.nome}</p>
                {m.tipo === "bonifico" && m.dati?.iban && (
                  <p className="truncate text-xs text-brand-navy/50">{m.dati.iban}</p>
                )}
                {m.tipo === "paypal" && m.dati?.email && (
                  <p className="truncate text-xs text-brand-navy/50">{m.dati.email}</p>
                )}
                {m.predefinito && (
                  <span className="mt-1 inline-block text-xs font-semibold text-brand-teal">predefinito</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => apriModifica(m)}
                className="rounded-lg px-2 py-1 text-sm text-brand-navy/60 hover:bg-brand-bg"
              >
                Modifica
              </button>
              <button
                type="button"
                onClick={() => elimina(m.id)}
                className="rounded-lg px-2 py-1 text-sm text-red-500 hover:bg-red-50"
              >
                Elimina
              </button>
            </div>
          ))
        )}
      </div>

      {modalAperto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-brand-navy">
                {edit ? "Modifica metodo" : "Nuovo metodo"}
              </h2>
              <button type="button" onClick={() => setModalAperto(false)} className="text-brand-navy/50">
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs font-semibold tracking-wide text-brand-navy/40">TIPO</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {TIPI.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, tipo: t.key, dati: {} }))}
                      className={`rounded-full px-3 py-1.5 text-sm ${
                        form.tipo === t.key
                          ? "bg-brand-navy text-white"
                          : "border border-black/10 bg-brand-bg text-brand-navy"
                      }`}
                    >
                      {iconaMetodoPagamento(t.key)} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold tracking-wide text-brand-navy/40">NOME *</label>
                <input
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="es. Conto principale"
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
                />
              </div>

              {form.tipo === "bonifico" && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold tracking-wide text-brand-navy/40">IBAN</label>
                    <input
                      value={form.dati?.iban || ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, dati: { ...f.dati, iban: e.target.value.toUpperCase() } }))
                      }
                      placeholder="IT60..."
                      className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold tracking-wide text-brand-navy/40">INTESTATARIO</label>
                    <input
                      value={form.dati?.intestatario || ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, dati: { ...f.dati, intestatario: e.target.value } }))
                      }
                      placeholder="Mario Rossi"
                      className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
                    />
                  </div>
                </>
              )}

              {form.tipo === "paypal" && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold tracking-wide text-brand-navy/40">EMAIL PAYPAL</label>
                  <input
                    type="email"
                    value={form.dati?.email || ""}
                    onChange={(e) => setForm((f) => ({ ...f, dati: { ...f.dati, email: e.target.value } }))}
                    placeholder={PLACEHOLDER.email}
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-teal"
                  />
                </div>
              )}

              {form.tipo === "stripe" && (
                <p className="rounded-lg bg-brand-bg px-3 py-2 text-xs text-brand-navy/60">
                  Al momento della generazione PDF verrà creato un link Stripe Checkout per il cliente.
                </p>
              )}

              <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-brand-bg px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={form.predefinito}
                  onChange={(e) => setForm((f) => ({ ...f, predefinito: e.target.checked }))}
                  className="rounded border-black/20"
                />
                <span className="text-sm text-brand-navy">Imposta come predefinito</span>
              </label>

              {errore && <p className="text-sm text-red-600">{errore}</p>}

              <button
                type="button"
                onClick={salva}
                disabled={saving}
                className="w-full rounded-lg bg-brand-teal py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? "Salvataggio..." : "Salva"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
