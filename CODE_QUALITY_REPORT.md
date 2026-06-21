# CODE_QUALITY_REPORT — preventivoai-desktop

Audit read-only · 2026-06-21 · Nessuna modifica al codice.

**Verdetto sintetico:** codebase **funzionale e tipizzato**, adatto a un prodotto solo-dev/MVP maturo, ma **non ancora “production-hardened”** per un porting mobile multi-piattaforma senza prima chiudere i gap su soldi, errori silenziosi e file monolitici. Stima onesta: **6,5/10** di professionalità interna oggi — buona base architetturale (`preventivoai-shared`, strict TS, separazione `lib/` / `components/`), con debito visibile da sviluppo rapido a step.

---

# PARTE 1 — Qualità / professionalità del codice

## 1. Gestione errori

### Punti di forza
- Molte operazioni critiche UI usano `alertErrore()` o `setErrore()` con messaggio utente (`useAbbonamento`, `PreventiviLista`, pagine impostazioni).
- `preventivo.ts`, `notifiche.ts` (segna/archivia) propagano `error.message` o lanciano `throw`.
- `ClienteDettaglio.ricaricaFatturato` usa un **reqId** anti-race per evitare overwrite stale (raro pattern esplicito, positivo).

### Problemi concreti

| Severità | Esempio | Problema |
|----------|---------|----------|
| Alta | `useAbbonamento.generaRataMeseCorrente` / `generaRateMultiple` (L217–241) | `insert` Supabase **senza controllo `error`**: piano abbonamento creato ma rate mancanti, UI mostra successo dopo `carica()`. |
| Alta | `preventivoPdfPiani.ts` — adapter `insertAbbonamento` / `insertRate` (L50–56) | Insert fire-and-forget; errori DB non risalgono a `creaPianoRateDaPreventivo` / builder PDF. |
| Alta | `fiscale.salvaProfiloFiscale` (L110–111) | `update` senza verificare `error`; salvataggio fiscale può fallire in silenzio. |
| Alta | `storico.ripristinaVersionePreventivo` (L88–90) | Due `update` separati (`is_ultimo`) **non transazionali**; fallimento parziale = due “ultimi” o nessuno. |
| Media | `incassi.ts` — `caricaPreventiviPagati`, `caricaRateIncasso`, ecc. | Solo `{ data }` da `queryConFiltroCestino`; **errori query → array vuoto → incasso = 0** senza avviso. |
| Media | `clienteDettaglio.caricaClienteDettaglio` (L9–34) | Errore su `clienti.single()` ignorato; `cliente` può essere `null` per failure rete, non solo “inesistente”. |
| Media | `useAbbonamento.carica()` (L124–143) | `{ data: tutti }` senza `error`; fallimento = lista piani vuota, loading finisce come se OK. |
| Media | `useAbbonamento.aggiornaRitardi` (L577) | `update` stato `in_ritardo` senza check errori. |
| Bassa | `pdfPreviewPaginata.ts` (L65) | `catch (e) {}` vuoto su `postMessage` iframe — accettabile ma silenzioso. |
| Bassa | `listinoMedia.ts` (L78) | `// ignore` su errore compressione immagine. |
| Bassa | Pattern diffuso `res.json().catch(() => ({}))` in `firma.ts`, `pdf.ts`, `listinoSmart.ts` | Errore HTTP mascherato come oggetto vuoto; messaggio utente generico o assente. |

**Try/catch vuoti:** uno reale nel sorgente TS (`pdfPreviewPaginata` string replace → iframe). Nessun `catch {}` su async business logic, ma molte funzioni **non hanno catch né check error** — equivalente pratico.

---

## 2. Consistenza

| Area | Varianti trovate | Esempio |
|------|------------------|---------|
| **Date display** | `formatData()` (`lib/format.ts`, locale `it-IT`) vs inline `toLocaleDateString` | `Home.tsx` L28–31 usa formato custom; `ClienteDettaglio.tsx` / `PreventivoStatoModal.tsx` usano `en-CA` + `T12:00:00` per input date pagamento. |
| **Date persistenza** | `new Date().toISOString()` vs date-only noon UTC | `registraPagamento` / `segnaPreventivoPagato` default ISO pieno; modali pagamento usano mezzogiorno locale convertito — stesso “giorno pagato” può shiftare in UI. |
| **Errori UI** | `window.alert` vs state `errore`/`messaggio` vs silent | `useAbbonamento` → `alertErrore`; `MessaggiCliente.tsx` → testo rosso; `incassi` → zero silenzioso. |
| **Loading** | boolean locale vs cache + ref vs nessuno | `ClienteDettaglio` fatturato: cache module-level + `fatturatoLoading`; `useAbbonamento.loading`; `NotificheProvider.loading` mai esposto in UI campanella. |
| **Modali** | `ModalShell` + stack Escape vs overlay inline | `MessaggiCliente.tsx` dialog uscita custom; resto app su `ModalShell` / `ConfirmDialog`. |
| **Importi monetari** | `parseImportoEuro` (shared) vs `parseFloat(x.replace(",", "."))` | Pagamenti rate/canone: shared. Listino (`listino.ts` L27–73), onboarding, `TrasferteCard`, `AnalisiFiscaleCard`: parseFloat diretto. |
| **Supabase errori** | check esplicito vs return raw client | `preventivo.ts` vs `listino.eliminaServizio` (ritorna promise grezza al chiamante). |
| **Navigazione sidebar** | `rememberPath()` scrive localStorage, `resolveSidebarTarget()` ignora memoria | `navMemory.ts` — path ricordati mai riletti (dead feature parziale). |

---

## 3. Commenti

### Stato attuale
- **Pochi commenti** in totale (~40 blocchi significativi in `src/`). Nessun `TODO`/`FIXME` legacy.
- Commenti **utili dove presenti**: PDF preview paginata (`pdfPreviewPaginata.ts` L83–84 footer A4), `incassi.ts` regola business L115, `nuovoDraft.ts` migrazione bozze.
- **Codice commentato abbandonato:** non trovato in blocco.

### Lacune (servirebbe spiegazione)
| Area | Gap |
|------|-----|
| `incassi.ts` | Regola anti-doppio conteggio preventivo+piano documentata in 1 riga, ma non spiega stati `parziale` vs `incassato` né cosa succede se `importo_totale` è null. |
| `useAbbonamento.ts` (~660 righe) | Logica `aggiornaRitardi`, `creaPianoRate`, acconto/saldo senza commenti; difficile da portare su mobile. |
| `sommaImportoRate` | Nessuna nota sul perché `parziale` somma `acconto` e `incassato` somma `importo` intero. |
| `NotificheProvider` | Interazione toast / realtime / polling Rust OS non documentata (tripla sorgente notifiche). |
| `fiscaleCalcolo.ts` | Thin re-export da shared — OK, ma builder (`AnalisiFiscaleCard`) mescola UI e ricalcolo lordo/netto senza doc. |

### Fuorvianti / rischiosi
- `clienteDettaglio.ts` L54: export `caricaCollegamentiPianoCliente as caricaCollegamentiPianoPreventivo` — nome suggerisce scope “preventivi globali”, implementazione filtra per **clienteId** (naming fuorviante).
- `App.tsx` L11: commento boilerplate Tauri tutorial ancora presente.

---

## 4. Naming

| Nome | Problema |
|------|----------|
| `caricaCollegamentiPianoPreventivo` | Alias di `caricaCollegamentiPianoCliente`; “Preventivo” nel nome è misleading. |
| `alertErrore` | Non è un alert di errore generico — è sempre `window.alert` bloccante. |
| `fatturato` in `ClienteStats` | Etichetta “Fatturato” ma valore da `calcolaIncassoCliente` = **incassi registrati** (pagati), non fatturato/accettato. |
| `segnaRataPagata` (`useAbbonamento`) | Chiama `registraPagamento` con saldo residuo intero — nome OK, ma diverso da `registraPagamento` usato altrove con importo parziale. |
| `testoConPagamento` | Funzione async che genera link Stripe/PayPal — “testo” sottostima side-effect di rete. |
| `pianoById` vs `trovaRata` | Coerenti internamente; `carica()` vs `ricarica` pattern non uniforme nel resto app (`ricarica` solo in notifiche). |

Naming generale: **italiano coerente**, leggibile. Problemi isolati, non sistemici.

---

## 5. Complessità (file / responsabilità)

### File oltre soglia 250 righe (top)

| Righe | File | Responsabilità mescolate |
|-------|------|---------------------------|
| **1344** | `pages/Nuovo.tsx` | Builder + chat AI + PDF + salvataggio + modifica versione + piano pagamento + fiscale + upload — **god page**. |
| **665** | `components/PreventiviLista.tsx` | Tabella + azioni bulk + modali firma/PDF/stato + cronologia versioni. |
| **659** | `lib/hooks/useAbbonamento.ts` | CRUD piani, rate, pagamenti, ritardi, rename, importi personalizzati — **god hook**. |
| **657** | `pages/ClienteDettaglio.tsx` | Tabs, modali pagamento, creazione piani, stats, collegamenti preventivo. |
| **363** | `components/settings/MessaggioMultilineChipEditor.tsx` | Editor DOM contentEditable + keyboard chip + serializzazione. |

### Funzioni lunghe
- `Nuovo.tsx`: decine di handler inline; difficile test unitario.
- `useAbbonamento.creaPianoRate` + `salvaImportiRatePersonalizzati`: validazione + DB + stato locale in un unico flusso.
- `MessaggioMultilineChipEditor`: ~15 helper DOM per gestione chip — complessità intrinseca, accettabile ma fragile.

**Giudizio:** separazione `lib/` vs pages accettabile, ma **3–4 nuclei monolitici** concentrano il rischio per il porting mobile.

---

## 6. Tipi TypeScript

### Config
- `strict: true`, `noUnusedLocals`, `noUnusedParameters` — **livello professionale**.

### Aggiramenti
| Tipo | Occorrenze | Nota |
|------|------------|------|
| `as any` | **0** | — |
| `@ts-ignore` / `@ts-expect-error` | **0** | — |
| `as unknown as X` | 3 | `home.ts` L118, `storico.ts` L38, `cestino.ts` L313 — join Supabase non tipizzati. |
| `as T` su risposte Supabase/API | ~25+ | Pattern dominante (`data as Notifica[]`, `data as Servizio[]`). Accettabile senza codegen Supabase, ma **nasconde drift schema**. |
| `as "canone" \| "rate"` | `useAbbonamento.pianoAttivoSuPreventivo` | Cast su stringa DB senza validazione runtime. |

**MessaggioMultilineChipEditor:** cast DOM (`as HTMLElement`) necessari e localizzati — OK.

---

# PARTE 2 — Funzioni / aree a rischio bug

Legenda priorità: **H** = alto, **M** = medio, **B** = basso.

---

## 2.1 Logica calcolo soldi

| Rischio | Funzione / area | Problema concreto (1 riga) |
|---------|-----------------|---------------------------|
| **H** | `useAbbonamento.registraPagamento` | Non valida `importoPagato > 0` né `Number.isFinite`: un importo **negativo** riduce `acconto` e può portare `acconto` sotto zero nel DB, aumentando il saldo residuo mostrato. |
| **H** | `useAbbonamento.registraPagamento` | Due click rapidi / doppia submit non serializzati: entrambi leggono lo stesso `rata.acconto` locale e il secondo overwrite può **sottrarre incasso** o segnare `incassato` con totale errato. |
| **H** | `incassi.calcolaIncassoCliente` / query helper | Se Supabase fallisce, `data` undefined → **incasso mostrato 0 €** in `ClienteStats` senza errore, l’utente crede di non aver incassato nulla. |
| **H** | `incassi.sommaImportoRate` | Stato `parziale` somma `acconto` senza `Math.min(acconto, importo)`: dati DB corrotti/manual edit possono **gonfiare** il fatturato cliente oltre l’importo rata. |
| **H** | `useAbbonamento.generaRateMultiple` | Insert batch senza check error: abbonamento creato con **0 rate** in DB ma UI ricaricata come successo. |
| **H** | `preventivoPdfPiani` adapter DB | `insertRate` ignora errori: PDF/generazione preventivo può procedere con piano **incompleto** lato DB. |
| **M** | `listino.creaServizio` / `parseFloat` | Stringa `"12,50abc"` → `NaN` → salvato `null` costo: listino con prezzo null, builder mostra 0 o comportamento indefinito. |
| **M** | `useAbbonamento.modificaImportoTotalePiano` (L430–440) | Aggiorna importi rate in loop senza transazione; fallimento a metà → **somma rate ≠ importo_default**. |
| **M** | `useAbbonamento.segnaRataPagata(true)` | Paga sempre **saldo residuo intero** con `data_incasso` default now — OK per toggle, ma diverso dal flusso modale con data scelta (inconsistenza data). |
| **M** | `home.ts` rate in ritardo (L170–181) | Select `saldo_residuo` da DB: se colonna assente o sempre null, fallback calcolato; se query fallisce → insight **“0 rate in ritardo”** falsamente rassicurante. |
| **M** | `incassi.fatturatoClienteCache` | Cache module-level mai invalidata su logout; tornando su stesso cliente nella sessione si mostra **stale** finché `ricaricaFatturato` non completa (mitigato da refetch, ma pagamento in altra tab non invalida). |
| **B** | `fiscale.salvaProfiloFiscale` `parseFloat \|\| default` | `"abc"` → default 78/15/…: salva profilo fiscale **silenziosamente sbagliato** se form bypassato. |
| **B** | `pagamenti.salvaMetodoPagamento` | Due step (reset predefinito + insert) non atomici — doppio predefinito possibile su crash intermedio. |

`fiscaleCalcolo.ts`: solo re-export da `preventivoai-shared` — rischio logica fiscale **delegato al shared** (fuori scope desktop, ma punto di attenzione per mobile).

---

## 2.2 Stato condiviso e race condition

| Rischio | Area | Problema concreto |
|---------|------|-------------------|
| **H** | `NotificheProvider` + Rust poller + Realtime | Stessa notifica può arrivare via **INSERT realtime** (toast JS) e **polling Rust** (notifica OS) quando app in background; `delivered_notification_ids` Rust non coordina con toast JS → **duplicati OS**. |
| **H** | `NotificheProvider.ricarica` | Chiamata concorrente da realtime INSERT + UPDATE + focus event senza cancel/token: **last-write-wins** su `setNotifiche`, badge può flickerare o saltare notifiche. |
| **M** | `NotificheProvider` toast queue | `enqueueToast` + timer eviction: notifica archiviata nel DB può restare in toast stack fino a TTL — disallineamento badge vs toast. |
| **M** | `useAbbonamento.carica()` | Cambio rapido `clienteId` (navigazione): fetch A può completare dopo B e **sovrascrivere** piani del cliente sbagliato (no abort controller). |
| **M** | `useAbbonamento` stato `ratePerPiano` | Aggiornamento ottimistico post-DB (`registraPagamento`) senza rollback se refresh successivo fallisce — UI/DB temporaneamente divergenti. |
| **M** | `useAbbonamento.aggiornaRitardi` | Effect dipende da `.length` rate, non da contenuto; cambio importo/stato senza cambio count **non ricalcola** ritardo fino a remount. |
| **B** | `eventBus.emit("aggiorna-home")` | Bus globale senza tipi evento; listener multipli possono triggerare **fetch duplicati** home senza dedup. |

---

## 2.3 Parsing / serializzazione

| Rischio | Area | Problema concreto |
|---------|------|-------------------|
| **M** | `MessaggioMultilineChipEditor` + shared | Serializzazione DOM → stringa: paste testo libero può introdurre variabili `{foo}` non whitelisted; `proteggiModificaMessaggio` le ripulisce **solo on commit** — stato intermedio editabile inconsistente. |
| **M** | `messaggiCliente.ts` cache | `caricaMessaggiCliente` cache per `userId` senza TTL; modifica profilo messaggi in altra sessione/tab → **template stale** fino a `force=true`. |
| **M** | `parsePreventivoTesto.ts` | Re-export shared; errori parsing testo AI in `Nuovo.tsx` spesso **best-effort** (commento L596) — voci mancanti silenziose. |
| **B** | `nuovoDraft.ts` `JSON.parse` | Bozza localStorage cast `as T` senza schema validation — upgrade app con shape diversa → **crash o stato corrotto** builder. |

---

## 2.4 Sessione / auth

| Rischio | Area | Problema concreto |
|---------|------|-------------------|
| **H** | Rust `set_notification_session` | Token JWT in memoria Rust **non refreshato** fino a prossimo `syncNativeNotificationSession`; dopo scadenza (~1h) polling REST fallisce finché utente non ri-triggera auth (logout silenzioso notifiche OS). |
| **M** | `useAuth` + operazioni in flight | `onAuthStateChange` chiama `clear_notification_session` su logout ma **non annulla** fetch Supabase già avviati — risposta post-logout può scrivere UI stale (breve window). |
| **M** | `nativeNotificationSession.ts` | Errore sync → solo `console.warn`; utente non sa che notifiche background **non funzionano**. |
| **M** | `NotificheBell.handleSegnaPagato` | `segnaPreventivoPagato(id, true)` **senza data** e senza check `{ error }` — pagamento registrato con timestamp now anche se update fallisce, dialog si chiude comunque. |
| **B** | `getInitialSession` vs `getUser` | Mix di `getSession` (cache) e `getUser` (network) nel codebase — edge case token revocato: UI autenticata, API 401. |

---

## 2.5 Codice Rust (`src-tauri/src/lib.rs`)

| Rischio | Punto | Problema concreto |
|---------|-------|-------------------|
| **M** | Polling loop (L151–218) | Su HTTP non-2xx o JSON invalido, `last_check` **non avanza** → stesso batch notifiche riprovato ogni 35s; con token scaduto loop infinito di errori `eprintln` (no backoff/clear session). |
| **M** | `delivered_notification_ids` | Set cresce per tutta la sessione app; ID mai rimossi → memoria bounded solo da volume notifiche giornaliero (B se volume basso). |
| **M** | `fetch_new_notifications` query `created_at gt last_check` | Notifiche con stesso timestamp o clock skew possono essere **saltate o duplicate** rispetto al realtime JS. |
| **B** | `expect("missing default window icon")` / build | Solo startup; panic se asset mancante — accettabile in dev, crash hard in build corrotta. |
| **B** | Mutex poison | `lock().map_err` gestito con log + skip — OK; nessun `unwrap()` nel path polling hot. |

Rust: **no panic nel loop polling** — gestione errori adeguata per MVP; gap principale è **sessione/token** e coordinamento con frontend.

---

## Priorità riassuntiva (solo elenco, no fix)

### P0 — Prima del porting mobile (soldi + silent fail)
1. `registraPagamento` — validazione importo + anti doppio submit  
2. `incassi.*` — propagare errori query, mai mostrare 0 su failure  
3. `generaRateMultiple` / `generaRataMeseCorrente` / `preventivoPdfPiani.insert*` — check error obbligatorio  
4. `ripristinaVersionePreventivo` — atomicità versioni  
5. `salvaProfiloFiscale` — check error update/insert  

### P1 — Affidabilità percepita
6. Coordinamento notifiche JS ↔ Rust (duplicati OS)  
7. `useAbbonamento.carica` — abort su cambio cliente  
8. Token refresh bridge Rust session  
9. Allineamento parse importi (`parseImportoEuro` ovunque)  
10. `NotificheBell.handleSegnaPagato` — gestione error + data pagamento  

### P2 — Manutenibilità porting
11. Spezzare `Nuovo.tsx` / `useAbbonamento.ts` / `PreventiviLista.tsx`  
12. Unificare date helper (display + persistenza)  
13. Tipizzare Supabase (codegen) per ridurre `as` casts  
14. Documentare regole incassi / stati rata in un unico posto (shared?)  

### P3 — Debito minore
15. Rimuovere dead nav memory o collegarlo a sidebar  
16. Rinominare `caricaCollegamentiPianoPreventivo`  
17. Etichetta “Fatturato” vs “Incassato” in UI stats  

---

## Conclusione per il porting mobile

Il desktop **non è “sporco” in senso caotico**: strict TypeScript, logica business critica già estratta in `preventivoai-shared`, pattern React moderni. È però **fragile sotto stress** (rete, concorrenza, input edge) proprio dove mobile richiederà gli stessi flussi (pagamenti, notifiche, incassi).

**Portare su mobile senza P0–P1** = alta probabilità di bug silenziosi su soldi e notifiche, difficili da debuggare cross-platform.

**Riferimento refactor recente:** vedi anche `REFACTOR_LOG.md` (sessione pulizia 2026-06-21) — ha rimosso dead code e log debug, ma **non ha affrontato** i rischi strutturali elencati sopra.
