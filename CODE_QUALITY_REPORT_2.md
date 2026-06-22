# CODE_QUALITY_REPORT_2 — preventivoai-desktop

Audit read-only #2 · 2026-06-21 · Nessuna modifica al codice.

**Contesto:** codice di riferimento per porting feature su mobile. Focus sul codice toccato dopo P1/P2/P3, fix nav memory, bozza preventivo, cascata eliminazione, notifiche OS, builder/servizi/clienti, date pagamento.

**Verdetto sintetico:** la base condivisa (`preventivoai-shared`) copre già buona parte del dominio monetario/PDF, ma **desktop e mobile divergono ancora su cestino, abbonamento DB e incassi** — da unificare in shared **prima** del porting. Bug residui più urgenti: **hard delete cliente**, **polling Rust notifiche**, **UX toggle pagato**, **hard delete definitivo cestino senza rollback**.

---

# PARTE 1 — Bug residui

Legenda severità: **Alta** | **Media** | **Bassa**

## 1.1 Cestino / cascata eliminazione (`cestino.ts`, `Cestino.tsx`, `PreventiviLista.tsx`)

| File | Riga | Severità | Descrizione |
|------|------|----------|-------------|
| `src/lib/cestino.ts` | 269–286 | **Alta** | `eliminaDefinitivamentePreventivi` cancella rate+abbonamenti prima dei preventivi; se il delete preventivi fallisce, i piani sono già persi senza rollback. |
| `src/lib/cestino.ts` | 162–197 | **Media** | `ripristinaPreventivi` ripristina i preventivi prima degli abbonamenti; fallimento sul secondo step lascia preventivi attivi e piani ancora in cestino. |
| `src/lib/cestino.ts` | 32–39, 47–60 | **Media** | `idsFamigliaPreventivo` ignora errori Supabase su `.single()` e sulla query figli; in caso di failure espande solo l’id in input, rischiando abbonamenti non collegati. |
| `src/lib/cestino.ts` | 66–85 | **Media** | `abbonamentiCollegatiPreventivi` in fallback schema senza `deleted_at` ri-query tutti gli abbonamenti (fix recente), ma errori di rete restano silenziosi → array vuoto. |
| `src/lib/cestino.ts` | 142–151 | **Media** | Fallback hard-delete preventivi (schema senza `deleted_at`) avviene dopo soft-delete abbonamenti, senza compensazione se hard-delete fallisce. |
| `src/lib/cestino.ts` | 294–325 | **Media** | `purgeCestinoScaduto` non controlla né segnala errori di `eliminaDefinitivamentePreventivi`; item scaduti possono restare nel DB. |
| `src/lib/cestino.ts` | 24–28 | **Bassa** | `giorniRimastiCestino` con `deletedAt` invalido produce `NaN` in UI. |
| `src/pages/Cestino.tsx` | ~46–52 | **Bassa** | Ricarica cestino senza gestione errori esplicita; lista potenzialmente stale. |
| `src/lib/clienti.ts` | 53–109 | **Alta** | `eliminaClienti` fa **hard delete** di preventivi, abbonamenti e rate, bypassando il cestino soft-delete usato altrove — incoerenza con cascata P3 e dati non recuperabili. |

## 1.2 Bozza Nuovo preventivo (`nuovoDraft.ts`, `nuovoNav.ts`, `nuovoRipresaPath.ts`, `Nuovo.tsx`)

| File | Riga | Severità | Descrizione |
|------|------|----------|-------------|
| `src/lib/nuovoDraft.ts` | 164–177 | **Alta** | Con bozze chat **e** manuale entrambe attive, la scelta del draft usa `getPercorsoRipresaNuovo()` (path stale) invece di timestamp/ultima modifica. |
| `src/lib/nuovoRipresaPath.ts` | 3–6, 18–19 | **Media** | Il path di ripresa non viene azzerato uscendo da `/nuovo/*`; resta in localStorage e influenza la risoluzione dual-draft. |
| `src/lib/nuovoDraft.ts` | 83–85 | **Media** | `save()` in localStorage senza try/catch (a differenza di `load()`); quota/private mode può far fallire l’autosave debounced in `Nuovo.tsx`. |
| `src/lib/nuovoDraft.ts` | 73–80 | **Media** | JSON corrotto in draft → `null` silenzioso, perdita lavoro senza avviso utente. |
| `src/pages/Nuovo.tsx` | 323–339, 226–228 | **Media** | Autosave parte prima del load `clienti`; `clienteNome` in bozza spesso vuoto nonostante `clienteSelezionatoId` valorizzato → messaggio dialog incompleto. |
| `src/lib/nuovoNav.ts` | 38–41 | **Bassa** | `percorsoNuovoPreventivoVuoto` cancella le bozze prima della navigazione; navigazione fallita = bozze già perse. |
| `src/components/NuovoPreventivoNavProvider.tsx` | 39–48 | **Bassa** | Intercett bozza letto al click; tab concorrenti possono mostrare stato obsoleto. |

## 1.3 Nav memory (`navMemory.ts`, `Sidebar.tsx`)

| File | Riga | Severità | Descrizione |
|------|------|----------|-------------|
| `src/lib/navMemory.ts` | 38–44 | **Bassa** | `resolveSidebarTarget` è alias di `getSectionRoot` — naming legacy può confondere chi cerca “memoria” persistente. |
| `src/pages/AppSettings.tsx` | 31–32 | **Bassa** | `clearLocalData` rimuove ancora `preventivoai-nav-memory` (chiave legacy non più scritta). |

*Nota:* il fix nav memory (sempre root sezione) è corretto per la sidebar; il ripresa-bozza usa `nuovoRipresaPath.ts` separato.

## 1.4 Notifiche OS + polling Rust (`notifiche.ts`, `NotificheProvider.tsx`, `lib.rs`)

| File | Riga | Severità | Descrizione |
|------|------|----------|-------------|
| `src-tauri/src/lib.rs` | 114–149, 170–216 | **Alta** | Poller Rust non filtra `snooze_until` né `letta`; notifiche già gestite/snoozate possono riapparire come alert OS in background. |
| `src/components/NotificheProvider.tsx` | 47–50, 247+ | **Media** | Finestra in foreground: JS salta OS notify; finestra in background: Rust può notificare mentre Realtime accoda toast in-app → doppio alert possibile. |
| `src/lib/notifiche.ts` | 79–94 | **Media** | `caricaNotificheCampanella` ritorna `[]` su qualsiasi errore DB; campanella vuota senza stato errore. |
| `src/components/NotificheBell.tsx` | ~49–52 | **Media** | `segnaTutteLette()` senza `.catch()`; fallimento DB lascia badge/stato locale disallineato. |
| `src/components/NotificheProvider.tsx` | 97–111 | **Bassa** | Badge usa overlay `visteLocalmente` non persistito; hover toast marca “vista” senza write DB. |
| `src/lib/notifiche.ts` | 69–71 | **Bassa** | `snooze_until` invalido → `NaN`, trattato come non snoozato. |

## 1.5 Date pagamento (`PreventivoStatoModal.tsx`, `PreventiviLista.tsx`, `format.ts`)

| File | Riga | Severità | Descrizione |
|------|------|----------|-------------|
| `src/components/PreventivoStatoModal.tsx` | 37–41, 98–101 | **Alta** | Attivando “Segna come pagato”, `mostraDataPagamento` diventa true ma `pagatoLocale` resta false → toggle visivamente OFF mentre il form data è aperto. |
| `src/components/PreventivoStatoModal.tsx` | 53–59 | **Media** | `confermaPagato` chiama `inputDateToIso` senza validazione; data vuota/invalida può produrre ISO non valido in DB. |
| `src/components/PreventiviLista.tsx` | 219–224 | **Bassa** | Update ottimistico usa `new Date().toISOString()` se data assente; modale usa mezzogiorno locale → stesso pagamento può mostrare date diverse. |
| `src/lib/hooks/useAbbonamento.ts` | 434–436 | **Bassa** | Incasso rata completa senza data esplicita usa ISO UTC “now”, non convenzione `inputDateToIso` usata altrove. |

## 1.6 Builder / servizi / clienti

| File | Riga | Severità | Descrizione |
|------|------|----------|-------------|
| `src/lib/listino.ts` | 13–23 | **Media** | `caricaServizi` ignora errori query → builder con listino vuoto senza feedback. |
| `src/lib/pagamenti.ts` | 46–55 | **Media** | `caricaMetodiPagamento` ignora errori → nessun metodo pagamento in builder, silenzioso. |
| `src/pages/Nuovo.tsx` | 701–712 | **Bassa** | `salvaVoceNelListino` usa `servizi.length` come `ordine`; insert concorrenti di voci custom possono collidere. |
| `src/pages/Nuovo.tsx` | 186–191 | **Bassa** | `cliente_id` da URL applicato senza verificare esistenza cliente in DB. |

## 1.7 Chip editor messaggi (`MessaggioMultilineChipEditor.tsx`)

| File | Riga | Severità | Descrizione |
|------|------|----------|-------------|
| `src/components/settings/MessaggioMultilineChipEditor.tsx` | 184–203 | **Bassa** | Logica DOM complessa per chip adiacenti/backspace; edge case con selection cross-block non coperti da test automatizzati (rischio chip “fantasma” o testo perso). |
| `src/components/settings/MessaggioMultilineChipEditor.tsx` | 210+ | **Bassa** | ~400 righe di manipolazione DOM inline; regressioni difficili da intercettare senza test E2E su template messaggi. |

## 1.8 Race condition / stato locale vs DB (cross-cutting)

| Area | Severità | Descrizione |
|------|----------|-------------|
| Cestino multi-step | **Media** | Delete/restore senza transazioni DB; UI assume successo se `{ error: null }` anche con 0 righe aggiornate. |
| `useAbbonamento.carica()` | **Media** | Ricarica piani senza abort su unmount (fix parziale P0 su altre path); navigazione rapida cliente→cliente può flashare dati stale. |
| Notifiche triple-source | **Media** | Realtime JS + polling Rust + `visteLocalmente` possono divergere su “letta/consegnata”. |
| Bozza localStorage | **Media** | Source of truth locale fino a “Genera”; cliente eliminato/cestinato può restare referenziato in draft. |
| `PreventiviLista` optimistic | **Bassa** | Update stato/pagato locale senza rollback se reload successivo fallisce. |

---

# PARTE 2 — Codice duplicato (candidate `preventivoai-shared`)

Priorità per porting mobile: estrarre **logica pura** e **moduli DB con stessa semantica** prima di duplicare su React Native.

## 2.1 Priorità ALTA — estrarre prima del porting

| Funzione / modulo | Desktop | Mobile | Similarità | Note |
|-------------------|---------|--------|------------|------|
| **`nuovoStatoDopoImportoRata`** | `src/lib/hooks/abbonamentoDb.ts` | `lib/api/abbonamentoImporti.ts` | **~100%** | Stessa logica 4-branch; candidato immediato in shared. |
| **`rateScaduteDaSegnalare` / aggiornamento ritardi** | inline in `useAbbonamento.ts` | `lib/api/abbonamentoImporti.ts` | **~95%** | Stesso confronto `giorno_scadenza` vs oggi. |
| **`sommaImportoRate`, aggregazione incasso** | `src/lib/incassi.ts` | `lib/api/incassi.ts` | **~90%** | Query shape quasi identiche; estrarre helper puri + thin wrapper Supabase per app. |
| **`nomeDaPreventivoId`, `pianoAttivoSuPreventivo`** | `src/lib/hooks/abbonamentoDb.ts` | `lib/api/abbonamentoHelpers.ts` | **~95%** | Duplicato con fallback `erroreColonnaDeletedAt`. |
| **`generaRataMeseCorrente`, `generaRateMultiple`, `generaRateConImporti`** | `abbonamentoDb.ts` | `lib/api/abbonamentoCreazione.ts` | **~90%** | Payload insert identici; desktop controlla errori, mobile spesso no. |
| **`PREVENTIVO_MADRE_SELECT`, `caricaPreventiviMadreMap`, fetch rate** | `abbonamentoDb.ts` | `lib/api/abbonamentoCarica.ts` | **~90%** | Stesse query map-building. |
| **Modifica importi piano/rate** | `useAbbonamento.ts` (embedded) | `lib/api/abbonamentoImporti.ts` | **~85%** | Stessi messaggi IT e uso `calcolaImportiRate`; mobile ha `ImportiAlert`, desktop `alertErrore`. |
| **Cestino cascade (`cestino.ts` intero)** | `src/lib/cestino.ts` | `lib/cestino.ts` | **~85% struttura, ~70% comportamento** | **Divergenza critica:** desktop `idsFamigliaPreventivo` (antenati+discendenti), mobile `idsCatenaPreventivo` (solo antenati); ordine soft-delete e rollback diversi. **Unificare regole in shared prima di condividere codice.** |
| **`caricaCronologiaPreventivo`** | `src/lib/storico.ts` | `lib/api/storico.ts` + duplicato in `clienteDettaglio.ts` | **~90%** | Mobile duplica walk catena versioni in 2 file. |
| **`preparaTestoPerPdfNuovo` / assembly `testoConPagamento`** | `src/lib/nuovoPianiPagamento.ts` | inline in `app/screens/preventivo-pdf.tsx` | **~85%** | Stessi parametri piano; desktop aggiunge acconto precomputato. |
| **Messaggi conferma eliminazione** | `src/lib/confermeElimina.ts` (6 fn) | `lib/confermeElimina.ts` (2 fn) | **~70%** | `messaggioEliminaDefinitiva` / `messaggioRipristina` identici; desktop ha messaggi piano/preventivo con `CollegamentiPianoMap`. Stringhe pure → shared. |
| **Date helpers (`formatData`, `inputDateToIso`, `oggiInputDate`, …)** | `src/lib/format.ts` | assente (usa solo `formatImportoEuro*` da shared) | **N/A desktop-only** | Logica pura `it-IT`; mobile ne avrà bisogno al porting schermate pagamento — **alta priorità shared**. |
| **`normalizzaTipoPiano`, `etichettaPianoCollegato`** | `src/lib/collegamentiPiano.ts` | parziale in `storico.ts` / `clienteDettaglio.ts` | **~75%** | Desktop più ricco; mobile mappa solo `tipo`. |

## 2.2 Priorità MEDIA — dopo unificazione cestino/abbonamento

| Funzione / modulo | Desktop | Mobile | Similarità | Note |
|-------------------|---------|--------|------------|------|
| **`useAbbonamento` orchestration** | `src/lib/hooks/useAbbonamento.ts` (~700 righe) | `lib/hooks/useAbbonamento.ts` (~350 righe) | **~65%** | Stesso flusso; estrarre business logic in shared, lasciare hook platform-specific (Alert vs window.alert, eventBus). |
| **Storico API (`caricaStorico`, `eliminaPreventivi`, …)** | `src/lib/storico.ts` | `lib/api/storico.ts` | **~80%** | Pattern Supabase allineati. |
| **`PreventivoPianiDb` adapter** | `src/lib/preventivoPdfPiani.ts` | `lib/api/preventivoPdfPianiDb.ts` | **~85%** | Wrapper su shared `creaAbbonamentoDaPreventivo`; unificare gestione errori insert. |
| **Catalogo errori abbonamento** | `alertErrore` + stringhe inline | `ImportiAlert` + stesse stringhe IT | **~80% testo** | Shared: enum/catalogo messaggi + `{ ok, errorCode, message }`. |
| **Nuovo draft types + `pianoPagamentoTipoDaBozza`** | `nuovoDraft.ts`, `nuovoBozzaSnapshot.ts` | assente (builder state in `lib/builder/state.ts`) | **~60% concetto** | Storage resta platform-specific; tipi e normalizzazione legacy → shared quando mobile avrà bozza. |
| **Badge/label rata UI** | inline `PianoEspanso`, `RigaPiano` | `PianoRateCard.badgeRata` | **~70%** | Semantica in `analizzaStatoPiano` (shared); label/colori duplicati. |

## 2.3 Già in `preventivoai-shared` — non duplicare

`formatImportoEuro`, `calcolaImportiRate`, `analizzaStatoPiano`, `validaPianiPagamento`, `erroreColonnaDeletedAt`, `queryConFiltroCestino`, `preventivoPdfPiani` core, `modificaPreventivo/*`, `messaggiCliente` (serializzazione chip), `fiscaleCalcolo`, `parsePreventivoTesto`, `giornoScadenza`, `calcolaAccontoSaldoPiano`.

## 2.4 Pattern errori duplicati (centralizzare)

| Pattern | Occorrenze tipiche | Proposta shared |
|---------|-------------------|-----------------|
| `{ data }` senza check `error` → `[]` | `listino.ts`, `pagamenti.ts`, `incassi.ts`, `caricaClienti`, `useAbbonamento.carica` | Helper `unwrapSupabaseList(query)` con `Result<T, ApiError>`. |
| `window.alert(error.message)` | `PreventiviLista`, `Nuovo`, `useAbbonamento` | Resta UI-specific; shared espone solo messaggio normalizzato. |
| Insert fire-and-forget | `abbonamentoDb.ts` insert rate, `generaRataMeseCorrente` | Shared layer DB con check obbligatorio. |

## 2.5 Ordine di estrazione consigliato (roadmap shared)

1. **Pure functions:** `nuovoStatoDopoImportoRata`, `sommaImportoRate`, aggregazione incasso, `format.ts` date, `confermeElimina` stringhe, `normalizzaTipoPiano`, builder testo PDF params.
2. **Unificare regole cestino** (documento + codice) e portare `cestino.ts` unificato in shared con adapter Supabase sottile per app.
3. **Modulo abbonamento DB** (carica/crea/modifica rate) con error handling uniforme.
4. **Incassi queries** con stessa semantica anti-doppio-conteggio.
5. **Nuovo draft** types/helpers quando mobile implementerà flusso bozza.

---

# PARTE 3 — Dead code

## 3.1 File orfani (mai referenziati dal grafo app)

| File | Evidenza |
|------|----------|
| `src/App.tsx` | Entry reale è `main.tsx` → `AppRouter`; zero import di `./App`. |
| `src/App.css` | Importato solo da `App.tsx` morto. |
| `src/assets/react.svg` | Importato solo da `App.tsx` morto. |

## 3.2 Residui refactor nav memory

| Elemento | Evidenza |
|----------|----------|
| `src/components/NavMemoryTracker.tsx` | File rimosso; sostituito da `NuovoRipresaPathTracker.tsx`. |
| `rememberPath`, `getRememberedPath`, localStorage `preventivoai-nav-memory` (write) | Rimossi da `navMemory.ts`; cleanup legacy solo in `AppSettings.clearLocalData`. |
| `resolveSidebarTarget` | Ancora chiamato da `Sidebar.tsx` ma equivalente a `getSectionRoot` — potrebbe essere inlined. |

## 3.3 Export pubblici mai importati altrove (candidati a `non-export`)

| File | Simbolo | Evidenza |
|------|---------|----------|
| `src/lib/navMemory.ts` | `NavSection` | Tipo usato solo internamente al file. |
| `src/lib/nuovoDraft.ts` | `NuovoChatDraft`, `infoBozzaNuovoInSospeso`, `percorsoRipresaBozzaNuovo` | Usati solo da moduli interni bozza (`nuovoNav.ts`). |
| `src/lib/nuovoBozzaSnapshot.ts` | `NuovoManualeDraftInput` | Tipo parametro locale, nessun import esterno. |
| `src/lib/collegamentiPiano.ts` | `CollegamentoPiano` | Consumer importano `CollegamentiPianoMap` / funzioni. |
| `src/lib/incassi.ts` | `RisultatoIncasso`, `sommaImportoRate` | Usati solo dentro `incassi.ts`. |
| `src/lib/home.ts` | `HomeInsightKind`, `contaPreventiviMese`, `contaClienti`, `generaHomeInsights` | Helper interni a `caricaHomeData`. |
| `src/lib/theme.ts` | `ThemeMode` | Mai importato; si usano getter/setter. |
| `src/lib/messaggiCliente.ts` | re-export `MessaggiClienteTemplates` | Consumer importano da `preventivoai-shared`. |
| `src/lib/hooks/useAbbonamento.ts` | `CreaPianoRateResult` | Tipo usato solo nel file hook. |
| `src/components/builder/BuilderPianoPagamentoCard.tsx` | re-export `PianoPagamentoTipo` | `Nuovo.tsx` importa da `nuovoDraft.ts`. |
| `src/lib/firma.ts` | vari tipi export | Usati solo internamente. |

## 3.4 Documentazione stale (non codice, ma fuorviante)

| File | Problema |
|------|----------|
| `REFACTOR_LOG.md` | Cita ancora `NavMemoryTracker` e `rememberPath()` attivi. |
| `CODE_QUALITY_REPORT.md` (#1) | Sezione nav memory obsoleta post-fix. |

---

# PARTE 4 — Leggibilità per sviluppatore senior esterno

## 4.1 Logica di business non ovvia (mancano commenti / doc)

| File | Riga | Gap |
|------|------|-----|
| `src/lib/cestino.ts` | 31–64, 119–151 | Perché abbonamenti **prima** dei preventivi in soft-delete e rollback su hard-delete fallback — regola non documentata inline. |
| `src/lib/cestino.ts` | 31–64 | Perché espansione **discendenti** oltre antenati (`idsFamigliaPreventivo`) — critico per piani su versioni figlie. |
| `src/lib/clienti.ts` | 53–109 | Hard delete vs cestino — comportamento opposto al resto app, nessun commento che spieghi la scelta. |
| `src/components/NotificheProvider.tsx` | intero file | Architettura a 3 canali (Realtime, toast, Rust OS) non spiegata; difficile capire quale path fire quando. |
| `src/lib/nuovoNav.ts` + `NuovoPreventivoNavProvider.tsx` | — | Separazione bozza (localStorage) vs nav sidebar (root fissa) vs ripresa path — merita diagramma o commento module-level. |
| `src/lib/nuovoDraft.ts` | 164–177 | Tie-break dual-draft via path ripresa — non intuitivo senza conoscere `nuovoRipresaPath`. |
| `src/pages/Nuovo.tsx` | ~1345 righe | Monolite che mescola chat, builder, PDF, piani, bozza, modifica — difficile onboarding. |
| `src/lib/hooks/useAbbonamento.ts` | ~700 righe | Stesso problema: CRUD + pagamenti + ritardi + UI alert in un unico hook. |
| `src/components/settings/MessaggioMultilineChipEditor.tsx` | 1–210 | 15+ helper DOM privati senza doc; intent (backspace chip, merge linee) non evidente. |

## 4.2 Naming fuorviante

| Nome | File | Problema |
|------|------|----------|
| `navMemory.ts` | `src/lib/` | Non c’è più memoria nav; contiene solo mapping sezione→path. Meglio `navSections.ts` o simile. |
| `resolveSidebarTarget` | `navMemory.ts` | Implica logica di risoluzione dinamica; oggi è `getSectionRoot`. |
| `caricaCollegamentiPianoPreventivo` | alias in `clienteDettaglio.ts` | Nome suggerisce scope globale preventivi; filtra per `clienteId`. |
| `alertErrore` | `useAbbonamento.ts` | Sempre `window.alert`, non un logger. |
| `finalizzaBozzaWorkflow` | `Nuovo.tsx` | “Finalizza” = cancella bozza post-save, non genera preventivo — ambiguo. |
| `idsFamigliaPreventivo` | `cestino.ts` | Nome buono; ma contrapposto a vecchio `idsCatenaPreventivo` solo su mobile — documentare in shared. |

## 4.3 Struttura cartelle — cosa non è intuitivo

| Area | Problema per chi arriva da fuori |
|------|----------------------------------|
| `src/lib/hooks/abbonamentoDb.ts` vs `useAbbonamento.ts` | Split DB/UI poco chiaro; metà logica business nel hook. |
| `src/lib/nuovo*.ts` (5+ file) | Responsabilità frammentate: draft, nav, ripresa path, piani pagamento, snapshot — serve README module o indice in `BUSINESS_RULES.md`. |
| `src/lib/` vs `preventivoai-shared` | Non sempre ovvio cosa va in shared; molti re-export sottili (`fiscaleCalcolo.ts`, `messaggiCliente.ts`). |
| `src/pages/Nuovo.tsx` vs `NuovoHub.tsx` vs route `/nuovo/*` | Flusso multi-route + bozza localStorage richiede lettura di 4–5 file prima di capire il flusso. |
| `src-tauri/src/lib.rs` | Notifiche native accoppiate al frontend senza contratto documentato (sync session, delivered ids). |

## 4.4 `BUSINESS_RULES.md` — sufficiente?

**File:** `SHARED/preventivoai-shared/BUSINESS_RULES.md`

**Copre bene:**
- Anti doppio conteggio preventivo singolo vs piano
- Stati rata e transizioni pagamento parziale/incassato
- Calcolo fatturato cliente (`calcolaIncassoCliente`)
- Progresso piano UI (`analizzaStatoPiano`)
- Flag `pagato` preventivo singolo

**Mancante / da estendere prima del porting mobile:**

| Regola aggiunta dopo P2 | Dove implementata | Priorità doc |
|-------------------------|-------------------|--------------|
| **Cestino soft-delete 7 giorni** e purge automatico | `cestino.ts`, `Layout.tsx` | Alta |
| **Cascata eliminazione preventivo → piano** (ordine ops, famiglia versioni, rollback) | `cestino.ts` | Alta |
| **Incoerenza elimina cliente (hard) vs elimina preventivo (cestino)** | `clienti.ts` vs `cestino.ts` | Alta |
| **Bozza Nuovo preventivo** (localStorage, intercept, ripresa path, clear on Genera) | `nuovoDraft.ts`, `nuovoNav.ts` | Media |
| **Nav sidebar sempre root** (no memoria tab) | `navMemory.ts` | Bassa (UX, non business) |
| **Notifiche: Realtime vs OS native vs snooze/letta** | `NotificheProvider`, `lib.rs` | Media |
| **Convenzione date pagamento** (mezzogiorno locale vs ISO UTC) | `format.ts`, modali pagamento | Media |
| **Collegamenti piano** (`normalizzaTipoPiano`, etichette UI) | `collegamentiPiano.ts` | Media |

**Raccomandazione:** aggiungere sezioni **10. Cestino e eliminazione**, **11. Bozza Nuovo preventivo**, **12. Notifiche**; spostare riferimenti file da path solo-desktop a tabella desktop/mobile/shared.

---

# Riepilogo priorità pre-porting mobile

| # | Azione | Impatto |
|---|--------|---------|
| 1 | Unificare `cestino.ts` desktop/mobile + documentare in `BUSINESS_RULES.md` | Evita bug piani orfani su mobile |
| 2 | Estrarre in shared: `nuovoStatoDopoImportoRata`, incasso aggregation, date helpers | ~1000+ righe duplicate |
| 3 | Allineare `eliminaClienti` al cestino o documentare eccezione esplicita | Integrità dati |
| 4 | Fix poller Rust: filtri `snooze_until`/`letta` | UX notifiche desktop |
| 5 | Fix UX `PreventivoStatoModal` toggle pagato | Bug visibile in produzione |
| 6 | Spezzare `Nuovo.tsx` / `useAbbonamento.ts` + README moduli | Onboarding dev esterni |
| 7 | Rimuovere dead code Vite (`App.tsx`) | Pulizia repo reference |

---

*Report generato da audit statico + confronto read-only con `preventivoai-mobile` e `preventivoai-shared`. Nessun file sorgente modificato.*
