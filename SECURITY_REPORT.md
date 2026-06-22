# Security Report — Audit dati sensibili PreventivoAI

**Data audit:** 22 giugno 2026  
**Tipo:** solo lettura — nessuna modifica al codice applicativo  
**Repo analizzati:** `preventivoai-desktop`, `preventivoai-backend`, `preventivoai-web`, `preventivoai-mobile`, `preventivoai-shared`  
**Contesto precedente:** audit live Supabase del 19/06/2026 (`CONTESTO_AI/AUDIT_SICUREZZA_SUPABASE.md`); refactor signed URL PDF del 22/06/2026

---

## Executive summary

| Area | Esito sintetico |
|------|-----------------|
| RLS tabelle core | Policy **non versionate in git** (create su dashboard); solo 3 tabelle firma/notifiche in migrazioni |
| Service role in client | **OK** — solo backend |
| Segreti hardcoded nel sorgente | **OK** — nessuna chiave reale nei repo app |
| Pagina firma `/p/[token]` | Token **forte**; payload **scoped**; **nessun rate limit** |
| Storage PDF/loghi | Codice migrato a **signed URL** per PDF; bucket `loghi` ancora `getPublicUrl()`; **stato bucket da verificare su dashboard** |
| Sessione desktop | **localStorage** WebView (rischio accesso fisico); bozze preventivo in chiaro |
| Log sensibili | **Migliorato** (Sentry filtra); residuo debug `cliente_id` backend |

---

## 1. Row Level Security (RLS)

### 1.1 Migrazioni SQL versionate

**Percorso unico:** `preventivoai-desktop/supabase/migrations/` (8 file).  
**Nessuna cartella `supabase/migrations/`** in `preventivoai-backend`, `preventivoai-web`, `preventivoai-mobile`, `preventivoai-shared`.

| File migrazione | Contenuto RLS |
|-----------------|---------------|
| `20250618120000_deleted_at_cestino.sql` | Solo colonne `deleted_at` + indici — **nessuna policy** |
| `20250620120000_firma_digitale.sql` | **RLS + policy** su `preventivo_invii`, `preventivo_invii_eventi`, `notifiche` |
| `20250620140000_messaggi_cliente.sql` | Colonna JSON su `profiles` — **nessuna policy** |
| `20250620160000_firma_manuale.sql` | Constraint/colonne firma manuale — **nessuna policy** |
| `20250620170000_firma_annullata.sql` | Schema annullamento — **nessuna policy** |
| `20250620180000_firma_realtime.sql` | Publication Realtime — **nessuna policy** |
| `20250620190000_notifiche_snooze.sql` | Colonna snooze — **nessuna policy** |
| `20250620200000_notifiche_tipi_estesi.sql` | CHECK tipi notifica — **nessuna policy** |

Il file `20250620120000_firma_digitale.sql` contiene anche il commento *«Eseguire su Supabase SQL Editor (prod)»*, segno che le migrazioni sono applicate manualmente o parzialmente, non necessariamente via Supabase CLI in pipeline.

### 1.2 Policy RLS presenti in git (solo tabelle firma/notifiche)

Da `20250620120000_firma_digitale.sql`:

| Tabella | Policy | Operazione | Condizione |
|---------|--------|------------|------------|
| `preventivo_invii` | `preventivo_invii_select_own` | SELECT | `auth.uid() = user_id` |
| `preventivo_invii` | `preventivo_invii_insert_own` | INSERT | `auth.uid() = user_id` |
| `preventivo_invii` | `preventivo_invii_update_own` | UPDATE | `auth.uid() = user_id` |
| `preventivo_invii_eventi` | `preventivo_invii_eventi_select` | SELECT | EXISTS invio con `user_id = auth.uid()` |
| `preventivo_invii_eventi` | `preventivo_invii_eventi_insert` | INSERT | stesso EXISTS |
| `notifiche` | `notifiche_select_own` | SELECT | `auth.uid() = user_id` |
| `notifiche` | `notifiche_update_own` | UPDATE | `auth.uid() = user_id` |

**Lacune intenzionali (se backend crea notifiche):** nessuna policy INSERT/DELETE su `notifiche` lato client; nessuna policy DELETE su `preventivo_invii`.

### 1.3 Tabelle utente richieste — copertura in git

| Tabella | Policy in migrazioni git | Stato da codice |
|---------|-------------------------|-----------------|
| `preventivi` | ❌ Assente | ⚠️ Solo su dashboard (audit 19/06: `auth.uid() = user_id`) |
| `clienti` | ❌ | ⚠️ Dashboard |
| `servizi` | ❌ | ⚠️ Dashboard |
| `profiles` | ❌ | ⚠️ Dashboard — INSERT permissivo segnalato |
| `metodi_pagamento` | ❌ | ⚠️ Dashboard |
| `abbonamenti` | ❌ | ⚠️ Dashboard |
| `rate_abbonamento` | ❌ | ⚠️ Dashboard |
| `notifiche` | ✅ Parziale (SELECT/UPDATE) | Migrazione git + estensioni tipo |
| `profili_fiscali` | ❌ | ⚠️ Dashboard |
| `trascrizioni` | ❌ | ⚠️ Dashboard |
| `segnalazioni` | ❌ | ⚠️ Dashboard |
| `preventivo_invii` | ✅ | Migrazione git |

### Findings RLS

| ID | Finding | Rischio | Dettaglio |
|----|---------|---------|-----------|
| RLS-1 | **Policy core non tracciate in git** | **Alto** (processo) | Le policy su `preventivi`, `clienti`, `servizi`, `profiles`, ecc. non compaiono in nessuna migrazione versionata. Non c’è audit trail Git delle regole di sicurezza del DB; drift tra prod/staging/dev non rilevabile via PR. |
| RLS-2 | Policy firma/notifiche in git ma deploy manuale | **Medio** | Anche le policy versionate dipendono da esecuzione manuale SQL Editor — rischio che prod e repo divergano. |
| RLS-3 | `profiles` INSERT `WITH CHECK (true)` | **Medio** | Confermato audit 19/06; non verificabile da codice attuale — **vedi sezione Dashboard**. |
| RLS-4 | `notifiche` senza INSERT client | **Basso** | Coerente se solo backend (service key) inserisce notifiche. |
| RLS-5 | `preventivo_invii.link_token` in chiaro in DB | **Medio** | Colonna definita in migrazione; token recuperabile via SELECT RLS-protected per l’artigiano o via service key. Preferibile solo `token_hash` + token restituito una volta alla creazione. |

---

## 2. Chiavi e segreti

### 2.1 Service role Supabase — verifica post-refactor

| Repo | Riferimenti `service_role` / `SUPABASE_SERVICE_KEY` | Esito |
|------|-----------------------------------------------------|-------|
| `preventivoai-desktop` | Nessuno | ✅ |
| `preventivoai-web` | Nessuno | ✅ |
| `preventivoai-mobile` | Nessuno | ✅ |
| `preventivoai-shared` | Nessuno | ✅ |
| `preventivoai-backend` | `server/config.js` → `createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)` | ✅ Corretto (server-side) |

Client usano solo chiavi anon/publishable:

- Desktop: `VITE_SUPABASE_ANON_KEY` (`src/lib/supabase.ts`)
- Web: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (`src/lib/supabase.ts`)
- Mobile: `EXPO_PUBLIC_*` via `app.config.js` + SecureStore adapter

### 2.2 Scan segreti hardcoded (sorgente, esclusi `.env` gitignored)

Pattern cercati: JWT `eyJ…`, `sk-ant-`, `sk-proj-`, `sb_secret_`, `SUPABASE_SERVICE`, API key Google/Stripe hardcoded.

| Esito | Dettaglio |
|-------|-----------|
| ✅ Nessuna chiave reale nel sorgente app | Service key solo via env in backend |
| ⚠️ File locali fuori repo app | Cartella `PreventivoAI/key/` con `url pub key.txt`, `supabase-database.env`, chiave firma Tauri — **rischio operativo** se condivisi/backupati |
| ⚠️ Archivio backup | `archive/web/backup/*/.env` con copie backend — gitignored ma presenti su disco |
| ✅ `.gitignore` | `.env` ignorato in desktop e backend |

### Findings chiavi

| ID | Finding | Rischio |
|----|---------|---------|
| KEY-1 | Service role non esposta nei client | **Basso** (OK) |
| KEY-2 | Segreti in `PreventivoAI/key/` e backup locali | **Medio** (operativo) — ruotare se mai esposti |
| KEY-3 | `SUPABASE_ANON_KEY` esportata e passata a Rust per polling notifiche | **Basso** — chiave pubblica by design; `access_token` più sensibile (vedi §5) |

---

## 3. Pagina pubblica firma (`/p/[token]`)

**Web:** `preventivoai-web/src/app/p/[token]/page.tsx`  
**Backend:** `GET /api/public/firma/:token`, `POST /api/public/firma/:token/accetta` (`server/routes/firma.js`)  
**Logica:** `datiPaginaFirma()` in `server/utils/firmaData.js`

### 3.1 Indovinabilità del token

```javascript
// firmaData.js — generaToken()
crypto.randomBytes(32).toString('base64url')
```

| Aspetto | Valutazione |
|---------|-------------|
| Entropia | 256 bit — **non indovinabile** con brute force pratico |
| Formato URL | `/p/{base64url}` (~43 caratteri) |
| Lookup DB | Hash SHA-256 (`token_hash`); plaintext in `link_token` solo per artigiano/DB |
| Scadenza | 30 giorni (`GIORNI_SCADENZA`) |
| Revoca | `revocato_at` controllato in `risolviInvioDaToken()` |

**Rischio token:** **Basso** per indovinabilità.

### 3.2 Payload `datiPaginaFirma()` — minimizzazione dati

**Restituito al client pubblico (stato `pronto`):**

- `stato`, `nomeCliente`, `nomeAzienda`, `importoTotale`, `titolo`, `html`, `scadeAt`
- Opzionale: `pdfOriginaleUrl` (signed URL 30 gg)

**Stati terminali:** solo nomi + URL PDF firmato (signed) + `firmatoAt` — nessun elenco di altri preventivi/clienti.

**Query interna** (`risolviInvioDaToken`): join singolo preventivo; `clienti(nome)` — **solo nome**, non telefono/email. Profilo azienda caricato per rendering HTML (p.IVA, telefono azienda, logo — appropriato per documento).

**Non esposto nel JSON pubblico:** `user_id`, `preventivo_id`, `cliente_id`, altri preventivi, lista clienti, `audit_json`, `link_token`, testo grezzo DB oltre all’HTML renderizzato.

**Nota:** l’`html` contiene il contenuto completo del preventivo (inclusi eventuali dati cliente embedded nel testo) — **necessario** per la firma, ma è PII se il link trapelasse.

| ID | Finding | Rischio |
|----|---------|---------|
| FIRMA-1 | Token crittograficamente forte | **Basso** (OK) |
| FIRMA-2 | Payload scoped a un solo preventivo | **Basso** (OK) |
| FIRMA-3 | `link_token` in chiaro in DB | **Medio** — vedi RLS-5 |
| FIRMA-4 | HTML espone contenuto preventivo completo | **Basso** (by design; mitigato da segretezza token) |

### 3.3 Rate limiting

| Endpoint | Rate limit |
|----------|------------|
| `GET /api/public/firma/:token` | ❌ Nessuno |
| `POST /api/public/firma/:token/accetta` | ❌ Nessuno |
| `/api/chat`, AI profilo | ✅ `middleware/aiRateLimit.js` |

**Raccomandazione futura (non bloccante):** rate limit per IP su GET (es. 30/min) e POST (es. 5/min) + risposta uniforme 404 per token invalidi (già parzialmente così) per ridurre enumerazione e abuso compute (generazione HTML/PDF).

| ID | Finding | Rischio |
|----|---------|---------|
| FIRMA-5 | Nessun rate limit su endpoint pubblici firma | **Medio** (hardening futuro) |

---

## 4. Storage bucket (PDF, loghi)

### 4.1 Stato nel codice (post-refactor 22/06)

**PDF (`preventivi-pdf`):**

- Upload: `pdfStorage.js`, `firmaData.js` — path `{userId}/{timestamp}.pdf`, `{userId}/firmati/{preventivoId}-{ts}.pdf`, ecc.
- **Nessun `getPublicUrl()`** nel backend attivo per PDF
- Serving: `pdfSignedUrls.js` — `createSignedUrl()` con scadenze:
  - Artigiano: 1 ora
  - Cliente (pagina firma): 30 giorni
  - Render interno: 1 ora
- Desktop salva in DB preferendo `storage_path` quando disponibile (`Nuovo.tsx` → `storagePathCaricato || urlCaricato`)
- Endpoint refresh: `GET /api/preventivi/:id/pdf-url` rigenera signed URL

**Loghi (`loghi`):**

- `logoStorage.js` → **`getPublicUrl()`** su path fisso `{userId}/logo`
- URL salvato in `profiles.logo_url` — visibile in HTML preventivi/PDF

### 4.2 Indovinabilità path

| Bucket | Pattern path | Indovinabilità |
|--------|--------------|----------------|
| `preventivi-pdf` | `{uuid_utente}/{timestamp}.pdf` | Timestamp enumerabile se UUID noto — **medio** con bucket pubblico |
| `preventivi-pdf` | `{uuid}/firmati/{uuid_preventivo}-{ts}.pdf` | UUID preventivo harder — **medio-basso** |
| `loghi` | `{uuid_utente}/logo` | **Alto** se UUID utente noto (JWT, API, URL) |

Con bucket **privato** + signed URL, path prevedibile è **mitigato** (serve token firmato).

### Findings storage

| ID | Finding | Rischio |
|----|---------|---------|
| STOR-1 | PDF: codice usa signed URL (miglioramento refactor) | **Basso** lato codice |
| STOR-2 | Loghi: ancora URL pubblici permanenti | **Medio** |
| STOR-3 | Legacy `pdf_url` in DB può essere vecchio URL pubblico | **Medio** — `storagePathFromPdfReference()` gestisce retrocompat; verificare bucket privato |
| STOR-4 | Stato `public: true` bucket su Supabase | **Alto** se ancora vero — **solo verificabile su dashboard** |

---

## 5. Dati in chiaro sul device (desktop)

### 5.1 Sessione Supabase

File: `src/lib/supabase.ts`

```typescript
persistSession: true,
// Nessun adapter custom → default supabase-js = localStorage (WebView Tauri)
```

| Dato | Dove | Rischio |
|------|------|---------|
| JWT access + refresh token | `localStorage` chiave `sb-<project-ref>-auth-token` | **Medio** — accesso fisico al PC con app loggata consente session hijack |
| `access_token` | Anche in memoria Rust (`src-tauri/src/lib.rs` → `SessionInfo`) per polling notifiche OS | **Medio** — stesso profilo minaccia |
| Anon key | Bundle app / env Vite | **Basso** (pubblica) |

**Confronto mobile:** `preventivoai-mobile` usa **Expo SecureStore** — posture migliore.

### 5.2 Altri dati locali (localStorage)

| Chiave / modulo | Contenuto | Rischio |
|-----------------|-----------|---------|
| `nuovoDraft.ts` | Messaggi chat AI, testo preventivo, nome cliente, `pdfUrl` | **Medio** — dati business/PII in chiaro |
| `theme.ts`, `appSettings.ts` | Preferenze UI/PDF | **Basso** |
| `sessionStorage` | Flag permessi notifiche | **Basso** |

### Findings device

| ID | Finding | Rischio |
|----|---------|---------|
| DEV-1 | Sessione Supabase in localStorage WebView | **Medio** — accettabile per app desktop B2B se PC protetto; segnalare in policy sicurezza |
| DEV-2 | Bozze preventivo/chat in localStorage | **Medio** |
| DEV-3 | Token JWT in processo Rust per notifiche background | **Medio** — necessario per feature; clear on logout (`clear_notification_session`) |

**Mitigazioni possibili (future, non implementate):** OS keychain via plugin Tauri, timeout sessione, cifratura bozze.

---

## 6. Log e telemetria

### 6.1 Backend

| File | Log | Sensibilità |
|------|-----|-------------|
| `instrument.js` | Sentry con filtro `password`, `token`, `pdf_base64`, `authorization`, ecc. | ✅ Buona hygiene |
| `preventivoHtml.js:22` | `console.log('cliente_id ricevuto:', cliente_id)` | **Basso** — UUID, non PII diretta; rimuovere in prod |
| `stripeConnect.js` | Log nomi env webhook, non valori secret | ✅ |
| `aiRateLimit.js` | Log `userId` + endpoint | **Basso** |
| `firma.js` / `firmaData.js` | Nessun log di token firma o `firma_base64` | ✅ |

### 6.2 Desktop (JS + Rust)

| File | Log | Sensibilità |
|------|-----|-------------|
| `Nuovo.tsx` | `console.warn("Upload PDF fallito:", err)` | **Basso** |
| `notifiche.ts`, `notifications.ts` | Errori generici, no token | ✅ |
| `lib.rs` | `eprintln!` solo errori polling notifiche | ✅ — no token/password |

### 6.3 Mobile

| File | Log | Sensibilità |
|------|-----|-------------|
| `lib/api/stripeConnect.ts` | Debug URL onboarding Stripe | **Basso** — URL pubblici redirect |
| Login | Password in SecureStore opzionale (biometria) | **Medio** — design choice mobile, fuori scope desktop |

### Findings log

| ID | Finding | Rischio |
|----|---------|---------|
| LOG-1 | Nessun log di token firma/password post-refactor | **Basso** (OK) |
| LOG-2 | Residuo debug `cliente_id` in `preventivoHtml.js` | **Basso** |
| LOG-3 | Sentry filtra campi sensibili request body | **Basso** (OK) |

---

## 7. Verifiche richieste su Supabase Dashboard

Questi punti **non sono verificabili solo da codice**. Controllare insieme:

### 7.1 RLS — allineamento prod vs git

- [ ] Per ogni tabella: `preventivi`, `clienti`, `servizi`, `profiles`, `metodi_pagamento`, `abbonamenti`, `rate_abbonamento`, `profili_fiscali`, `trascrizioni`, `segnalazioni`, `sessioni`, `ai_usage`, `eventi`:
  - RLS **ATTIVO**?
  - Policy con `auth.uid() = user_id` (o equivalente join) su **ALL** o SELECT/INSERT/UPDATE/DELETE?
  - Nessuna policy `USING (true)` / `WITH CHECK (true)` eccetto casi documentati?
- [ ] Policy `profiles` INSERT — restringere a `auth.uid() = id`?
- [ ] Confrontare policy live con migrazione `20250620120000_firma_digitale.sql` (firma/notifiche)
- [ ] Esportare policy attuali in nuova migrazione baseline (raccomandato)

### 7.2 Storage

- [ ] Bucket `preventivi-pdf`: **privato** (`public: false`)?
- [ ] Bucket `loghi`: public o private? Policy su `storage.objects`?
- [ ] Se bucket PDF ancora public: signed URL **non** impedisce accesso diretto `.../object/public/preventivi-pdf/...` con path indovinato
- [ ] Elenco file legacy con URL public in `preventivi.pdf_url` / `preventivo_invii.pdf_firmato_url`

### 7.3 Auth & Advisor

- [ ] Leaked password protection abilitata?
- [ ] Avvisi Security Advisor attuali (funzione `handle_new_user` SECURITY DEFINER, ecc.)
- [ ] Realtime publication: tabelle esposte coerenti con RLS

### 7.4 Operativo

- [ ] Service role key ruotata se file in `PreventivoAI/key/` mai condivisi
- [ ] Railway env: solo variabili necessarie; no leak in log deploy

---

## 8. Riepilogo finding per priorità

### Alto

| ID | Area | Azione suggerita |
|----|------|------------------|
| RLS-1 | RLS | Baseline migration con tutte le policy core; CI/CD Supabase |
| STOR-4 | Storage | Verificare/imporre bucket PDF privato su dashboard |

### Medio

| ID | Area | Azione suggerita |
|----|------|------------------|
| RLS-2 | RLS | Deploy migrazioni via CLI, non solo SQL Editor |
| RLS-3 | RLS | Fix policy INSERT `profiles` |
| RLS-5 / FIRMA-3 | Firma | Valutare rimozione colonna `link_token` plaintext |
| FIRMA-5 | Firma | Rate limit endpoint pubblici |
| STOR-2 / STOR-3 | Storage | Privatizzare loghi o accettare esposizione; migrare URL legacy |
| KEY-2 | Segreti | Pulizia cartella `key/`, rotazione se necessario |
| DEV-1 / DEV-2 | Desktop | Documentare rischio; valutare keychain |

### Basso

| ID | Area | Nota |
|----|------|------|
| KEY-1 | Segreti | OK |
| FIRMA-1 / FIRMA-2 | Firma | OK |
| LOG-1 / LOG-3 | Log | OK |
| LOG-2 | Log | Rimuovere debug quando conveniente |

---

## 9. Metodologia

- Grep/lettura sorgenti sui 5 repo (esclusi `node_modules`, bundle, archive non attivi)
- Confronto con audit Supabase 19/06/2026 per policy DB non presenti in git
- Verifica esplicita post-refactor: `pdfSignedUrls.js`, `pdfStorage.js`, `firmaData.js`, `Nuovo.tsx`
- Nessuna query live Supabase in questo audit (solo codice + documentazione precedente)

---

*Report generato automaticamente — nessuna modifica al codice applicativo.*
