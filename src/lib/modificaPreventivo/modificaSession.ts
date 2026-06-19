import type { ModificaPreventivoInput } from "./apriModificaPreventivo";

let modificaSession: ModificaPreventivoInput | null = null;

export function setModificaSession(input: ModificaPreventivoInput) {
  modificaSession = input;
}

export function getModificaSession() {
  return modificaSession;
}

export function clearModificaSession() {
  modificaSession = null;
}

type ParamsModifica = {
  modifica?: string;
  testo_modifica?: string;
  versione_padre_id?: string;
  versione_numero?: string;
  cliente_id?: string;
  cliente_nome?: string;
  trascrizione?: string;
};

export function risolviModifica(params: ParamsModifica): ModificaPreventivoInput | null {
  const session = getModificaSession();
  const attiva = params.modifica === "1" || Boolean(params.testo_modifica) || Boolean(session);
  if (!attiva) return null;

  return {
    testoPreventivo: session?.testoPreventivo || params.testo_modifica || "",
    versionePadreId: session?.versionePadreId || params.versione_padre_id || "",
    versioneNumero: session?.versioneNumero || parseInt(params.versione_numero || "2", 10),
    clienteId: session?.clienteId || params.cliente_id || "",
    clienteNome: session?.clienteNome || params.cliente_nome || "",
  };
}
