# REFACTOR_LOG — preventivoai-desktop (2026-06-21)

Refactor qualità interna, **zero cambi di comportamento/UX**. Nessun commit creato.

---

## 1. Dead code e file orfani

### Rimosso (zero riferimenti reali)

| File | Cosa |
|------|------|
| `src/lib/clienteDettaglio.ts` | `aggiornaClienteDettaglio()` + tipo `ClienteAggiornamento` |
| `src/lib/collegamentiPiano.ts` | `etichettaPianoCollegatoDettaglio()`; import `rimuoviDataDaNomePiano` non più necessario; import `preventivoai-shared` unificato |
| `src/lib/incassi.ts` | `caricaIncassiPerCliente()` + helper `clienteIdDaRata()` (usato solo lì) |
| `src/lib/messaggiCliente.ts` | `salvaMessaggiCliente()` (salvataggio passa da `salvaProfiloSettings` in `MessaggiCliente.tsx`) |
| `src/lib/navMemory.ts` | `getRememberedPath()` (mai chiamata) |
| `src/lib/nuovo.ts` | `aggiornaPdfUrlPreventivo()` |
| `src/lib/pdfPreview.ts` | `preparaHtmlAnteprima()` (costanti `PDF_*` restano) |
| `src/lib/pdfPreviewPaginata.ts` | `altezzaPaginaScalata()` |
| `src/lib/format.ts` | `statoStile` (mai importato) |
| `src/lib/settingsConstants.ts` | `hexColoreValido()` |
| `src/lib/onboarding.ts` | type alias `OnboardingCategoria` (mai importato) |
| `src/lib/pagamenti.ts` | tipi documentali `DatiPayPal`, `DatiBonifico` (mai importati) |

### Re-export inutili rimossi

| File | Export rimossi |
|------|----------------|
| `src/lib/constants.ts` | `labelMese` |
| `src/lib/firma.ts` | `buildMessaggioCondividiPdf`, `testoInvioFirma` (i consumer importano da `preventivoai-shared`) |
| `src/lib/fiscaleCalcolo.ts` | `calcolaIrpef`, `RisultatoFiscale` |
| `src/lib/modificaPreventivo/apriModificaPreventivo.ts` | `PreventivoModifica` |
| `src/lib/parsePreventivoTesto.ts` | `ParsedPreventivoTesto`, `VocePreventivoParsed`, `TrasfertaParsed` |

### Export ridotti (solo uso interno al file)

| File | Cosa |
|------|------|
| `src/components/clienteDettaglio/RigaPiano.tsx` | `RigaPianoLayout`, `RigaPianoProps`, `badgeStato` → non più `export` (`VariantePiano` resta export per `PianoEspanso`) |
| `src/components/clienteDettaglio/PianoEspanso.tsx` | `PianoEspansoMode` → non più `export` |

### Verificato, lasciato intenzionalmente

- `App.tsx` default export: entry point Vite, ts-prune falso positivo.
- **Nav memory (2026-06):** `NavMemoryTracker` e `rememberPath()` sono stati rimossi; sostituiti da `NuovoRipresaPathTracker` e `navMemory.ts` semplificato (solo mapping sezione → path root, senza memoria persistente).
- Nessun TODO/FIXME obsoleto nel sorgente `src/`.

**Verifica post-area:** `npx tsc --noEmit` ✅

---

## 2. Log di debug residui

### TypeScript — rimosso

| File | Modifica |
|------|----------|
| `src/lib/notifiche.ts` | Rimosso `console.log("[notifiche-os] tentativo invio", …)` diagnostico pre-`sendNotification` |
| `src/lib/notifications.ts` | Rimossi `console.log` su permesso già concesso / esito grant; corretto formatting riga `richiediPermessoNotifiche()` |

### TypeScript — mantenuto (errori operativi)

| File | Motivo |
|------|--------|
| `src/lib/notifiche.ts` | `console.error` su errori reali (`caricaNotificheCampanella`, invio OS) |
| `src/lib/notifications.ts` | `console.warn` se richiesta permesso fallisce |
| `src/lib/nativeNotificationSession.ts` | `console.warn` se sync sessione Tauri fallisce |
| `src/pages/Nuovo.tsx` | `console.warn("Upload PDF fallito")` su errore upload |

### Rust — mantenuto

| File | Motivo |
|------|--------|
| `src-tauri/src/lib.rs` | Tre `eprintln!` su errori polling/stato/notifica OS — utili in produzione desktop, nessun log diagnostico temporaneo trovato |

**Verifica post-area:** `npx tsc --noEmit` ✅

---

## 3. Consistenza pattern recenti

### Applicato

- Import duplicati `preventivoai-shared` unificati in `collegamentiPiano.ts`.
- `notifications.ts`: formattazione allineata al resto del progetto.

### Verificato — nessuna modifica necessaria

- `PagamentoCard`, `NotificheProvider`, `NotificaToastStack`, `MessaggioMultilineChipEditor`, `ListinoServizi`, `Clienti.tsx`: pattern hook/errori già coerenti col resto del codebase.
- Flussi pagamento recenti (`ClienteDettaglio`, `PianoRateCard`, `ClienteAbbonamentoModals`) usano già `parseImportoEuro` da `preventivoai-shared`.

**Verifica post-area:** `npx tsc --noEmit` ✅

---

## 4. Tipi TypeScript

### Applicato

- `useAbbonamento.registraPagamento`: return type esplicito `Promise<void>`.

### Verificato

- Nessun `any` / `as any` in `src/`.
- `segnaPreventivoPagato(id, pagato, dataPagamento?)` → già tipizzato con `Promise<{ error: string | null }>`.
- Chip editor: validazione via `proteggiModificaMessaggio` / `variabileBloccataInTemplate` da `preventivoai-shared` (nessun gap evidente).

**Verifica post-area:** `npx tsc --noEmit` ✅

---

## 5. Stili orfani

- Progetto **Tailwind-only** in componenti React: nessun `StyleSheet`, nessun oggetto `styles` con chiavi orfane nei file recenti.
- `src/App.css` contiene boilerplate Vite (` .logo`, `#greet-input`, ecc.) ancora importato da `App.tsx` — **non rimosso** (rischio effetti globali CSS non mappati).

**Verifica post-area:** ispezione manuale ✅

---

## 6. Struttura file

Verificata collocazione file nuovi:

| File | Posizione | Esito |
|------|-----------|-------|
| `NotificheProvider.tsx` | `src/components/` | OK (provider app-wide) |
| `NotificaToastStack.tsx` | `src/components/` | OK (accoppiato a campanella) |
| `MessaggioMultilineChipEditor.tsx` | `src/components/settings/` | OK (solo editor impostazioni) |
| `nativeNotificationSession.ts` | `src/lib/` | OK (bridge Tauri) |

Nessuno spostamento necessario (evitati refactor import ad alto rischio).

---

## 7. Sicurezza — revisione mirata

| Controllo | Esito |
|-----------|-------|
| Secret hardcoded in sorgente | **OK** — solo env vars (`VITE_SUPABASE_*`, `VITE_BACKEND_URL`). Password updater solo in `scripts/release-build.ps1` da file locale |
| `.env` in `.gitignore` | **OK** |
| Supabase client | **OK** — solo `VITE_SUPABASE_ANON_KEY` in `supabase.ts` |
| Service role lato frontend | **Non trovata** |
| `set_notification_session` (Tauri) | **OK** — `access_token` in `SessionInfo` in memoria Rust, usato solo come Bearer su REST; **non loggato** negli `eprintln!` |
| Input data pagamento | Validazione lato UI/hook pre-update (`registraPagamento` controlla stato rata, importi via `parseImportoEuro`) |
| Chip editor messaggi | `proteggiModificaMessaggio` blocca rimozione variabili obbligatorie / URL firma |

Nessuna vulnerabilità critica introdotta o lasciata aperta nei flussi recenti.

---

## 8. Verifica finale

| Comando | Esito |
|---------|-------|
| `npx tsc --noEmit` | ✅ pulito |
| `cargo check` (src-tauri) | ✅ pulito |
| `npm run build` | ✅ pulito (warning Vite chunk size / dynamic import pre-esistenti) |

---

## Saltato per rischio di cambiare comportamento

| Item | Motivo |
|------|--------|
| Sostituire `parseFloat` con `parseImportoEuro` in `listino.ts`, `TrasferteCard.tsx`, `ListinoSmartPanel.tsx`, `AnalisiFiscaleCard.tsx`, `onboarding.ts` | Parsing monetario legacy; `parseImportoEuro` gestisce edge case diversamente (stringhe vuote, formati IT) — rischio silenzioso su importi |
| `parseInt` su giorni/mesi/numero rate | Non sono importi euro — uso corretto |
| `parseFloat` in `fiscale.ts` | Percentuali fiscali profilo, non importi preventivo |
| Collegare `getSectionRoot()` a memoria nav persistente | Cambierebbe navigazione sidebar (oggi sempre root sezione) |
| Rimuovere chiave legacy `preventivoai-nav-memory` da `AppSettings.clearLocalData` | Solo cleanup localStorage; nessun write attivo |
| Rimuovere/pulire `App.css` boilerplate Vite | Potrebbe alterare stili globali residui |
| Spostare componenti notifiche sotto sottocartella `components/notifiche/` | Solo refactor path/import, alto rischio merge conflict, zero beneficio runtime |
| `NotificheBell` → `segnaPreventivoPagato(id, true)` senza data | Comportamento pre-esistente voluto dalla campanella |
| Code-splitting bundle 900 kB | Performance/UX, fuori scope “qualità interna senza cambi visibili” |

---

## Riepilogo numerico

- **~20 simboli/funzioni** dead code rimossi
- **~5 export** ridotti a scope interno
- **3 console.log** diagnostici rimossi
- **0** commit creati
- **0** cambi schema Supabase / backend / mobile
