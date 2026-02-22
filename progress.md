# Progress – Modifiche e miglioramenti

Questo file raccoglie le modifiche e i miglioramenti apportati al progetto. **Da qui in avanti ogni miglioramento viene documentato qui.**

---

# 1. Lightbox avatar fullscreen nel menu utente

**Data e ora:** 22 febbraio 2025 (session)

---

## 1. Richiesta

Dalla dashboard, cliccando sulla foto profilo (avatar) nell’header:
- aprire l’avatar **a schermo intero** per poterlo vedere bene;
- chiudere il lightbox **automaticamente** se l’utente clicca **fuori** dalla foto ingrandita.

---

## 2. Analisi e dove intervenire

- L’avatar in header è nel **User Menu**: `extra-tracker/src/shared/components/UserMenu/UserMenuDropdown.tsx`.
- L’avatar è il componente **UserAvatar** (motion.div con img o iniziali), usato sia nel **pulsante trigger** (header) sia nella **sidebar** del menu (profilo grande).
- Il pulsante attuale apre/chiude il **dropdown** (sidebar). Per non far aprire il menu quando si clicca solo sulla foto, serve **separare** il click sull’avatar da quello sul resto del bottone (nome, chevron).
- Soluzione scelta: **lightbox** (overlay fullscreen) che si apre al click sull’avatar e si chiude al click sul backdrop o con Escape.

---

## 3. Modifiche al codice

**File modificato:** `extra-tracker/src/shared/components/UserMenu/UserMenuDropdown.tsx`

### 3.1 Stato per il lightbox

- Aggiunto stato `avatarLightboxOpen` (boolean) per sapere se il lightbox è aperto o chiuso.

### 3.2 Avatar nel trigger (header) cliccabile

- L’avatar nel pulsante dell’header è stato avvolto in un **div** con:
  - `onClick`: `e.stopPropagation()` + se `profile?.avatar` esiste → `setAvatarLightboxOpen(true)`.
  - `onKeyDown`: su Enter/Spazio, stessa logica (per accessibilità).
  - `className`: `cursor-pointer` e focus visible solo quando c’è un’immagine (`profile?.avatar`).
- In questo modo il click sulla **foto** apre il lightbox e **non** il dropdown; il click sul resto del bottone continua ad aprire/chiudere il menu.

### 3.3 Avatar nella sidebar cliccabile

- Anche l’**UserAvatar** grande nella sezione profilo della sidebar è stato avvolto in un div con la stessa logica: click (e tasti) aprono il lightbox solo se `profile?.avatar` è presente.

### 3.4 Lightbox fullscreen (portal)

- Aggiunto un **secondo portal** (`createPortal(..., document.body)`) che renderizza il lightbox fuori dalla gerarchia del menu.
- Contenuto del lightbox:
  - **Backdrop**: `fixed inset-0`, `z-[10000]`, sfondo nero semi-trasparente (`bg-black/90`) e blur, `onClick={() => setAvatarLightboxOpen(false)}` per chiudere.
  - **Immagine**: `profile.avatar` in un `motion.img` centrato, `max-w-[90vw] max-h-[90vh]`, `object-contain`, `onClick={(e) => e.stopPropagation()}` così il click sulla foto **non** chiude.
- Animazioni con **AnimatePresence** e **motion**: fade in/out del backdrop, leggero scale in/out dell’immagine.
- Il lightbox viene mostrato solo se `avatarLightboxOpen && profile?.avatar`.

### 3.5 Chiusura e comportamento

- **Click fuori**: il click sul backdrop (il div fullscreen) chiama `setAvatarLightboxOpen(false)`.
- **Escape**: `useEffect` che ascolta `keydown`; se `e.key === 'Escape'` → `setAvatarLightboxOpen(false)`. Listener aggiunto/rimosso in base a `avatarLightboxOpen`.
- **Scroll bloccato**: nello stesso `useEffect` che gestisce Escape, quando `avatarLightboxOpen` è true si imposta `document.body.style.overflow = 'hidden'`; in cleanup si ripristina `document.body.style.overflow = ''`.

---

## 4. Come funziona (comportamento)

1. **Apertura**
   - L’utente clicca sulla **foto** dell’avatar (in header o nella sidebar del menu).
   - Se c’è un’immagine profilo (`profile?.avatar`), si apre il lightbox: overlay fullscreen e immagine centrata e ingrandita (rispettando 90vw/90vh).
   - Il menu dropdown **non** si apre se il click è solo sull’avatar (grazie a `stopPropagation`).

2. **Chiusura**
   - Click **ovunque fuori** dalla foto (sul backdrop) → lightbox si chiude.
   - Tasto **Escape** → lightbox si chiude.
   - Durante il lightbox lo scroll della pagina è bloccato.

3. **Casi particolari**
   - Se l’utente ha solo le iniziali (nessun avatar): l’avatar non è “cliccabile” per il lightbox (nessun `cursor-pointer` / apertura), il comportamento resta quello di prima (click apre il menu).

---

## 5. Scelte tecniche

- **Portal**: il lightbox è renderizzato in `document.body` per evitare problemi di z-index e overflow e per avere il backdrop davanti a tutto (z-index 10000, sopra la sidebar del menu che è 9998/9999).
- **stopPropagation**: usato sia sul wrapper dell’avatar (per non far aprire il dropdown) sia sull’immagine nel lightbox (per non chiudere cliccando sulla foto).
- **Stato locale**: un solo boolean `avatarLightboxOpen` nel componente `UserMenuDropdown`; nessun context o store aggiuntivo.
- **Accessibilità**: wrapper avatar con `role="button"`, `tabIndex={0}`, gestione Enter/Spazio; backdrop del lightbox con `aria-label="Chiudi anteprima avatar"`; `draggable={false}` sull’immagine per evitare trascinamento accidentale.
- **Solo se c’è l’immagine**: il lightbox e il comportamento “clicca per ingrandire” sono attivi solo quando `profile?.avatar` è valorizzato, così non si apre un lightbox vuoto per utenti senza foto.

---

## 6. Riepilogo file e righe toccate

| File | Modifiche |
|------|-----------|
| `extra-tracker/src/shared/components/UserMenu/UserMenuDropdown.tsx` | Stato `avatarLightboxOpen`; wrapper cliccabili attorno ai due `UserAvatar`; `useEffect` per Escape e lock scroll; nuovo portal con lightbox (backdrop + img, AnimatePresence, motion). |

Nessun nuovo file creato; nessuna modifica ad altri moduli (auth, settings, api). La modifica è contenuta nel solo componente del menu utente.

---

# 2. CTA Dashboard – Rimozione animazioni hover (UX)

**Data e ora:** 22 febbraio 2025 (session)

---

## 1. Richiesta

Il bottone CTA principale della dashboard (“Vai agli Esami”) aveva animazioni al passaggio del mouse che creavano **errori grafici/UX**: rettangolo con spigoli visibili (effetto “shine” che scorreva). L’utente voleva **rimuovere queste animazioni** per un’esperienza più pulita e stabile.

---

## 2. Analisi e dove intervenire

- Il componente è **DashboardPage**: `extra-tracker/src/features/dashboard/pages/DashboardPage.tsx`.
- La CTA è un `<button>` con classe `dashboard-main-cta` e conteneva:
  - Un div **“shine”**: gradiente bianco semi-trasparente con `-translate-x-full` / `group-hover:translate-x-full` e `skew-x-[-20deg]` che, al hover, faceva scorrere una banda luminosa → generava l’effetto “rettangolo con spigoli”.
  - **Hover sul bottone**: `hover:-translate-y-1`, `hover:shadow-[0_0_40px_...]`.
  - **Hover sullo sfondo**: `group-hover:opacity-100`.
  - **Hover sull’icona**: `group-hover:scale-110` sul cerchio.
- Soluzione: **rimuovere** l’effetto shine e tutte le animazioni hover, mantenendo solo il focus ring per accessibilità.

---

## 3. Modifiche al codice

**File modificato:** `extra-tracker/src/features/dashboard/pages/DashboardPage.tsx`

### 3.1 Rimosso effetto “shine”

- Eliminato il div con classe `absolute inset-0 -translate-x-full group-hover:translate-x-full ... skew-x-[-20deg]` (gradiente che scorreva al hover).

### 3.2 Bottone CTA

- Rimosse classi: `group`, `hover:shadow-[0_0_40px_rgba(124,58,237,0.3)]`, `hover:-translate-y-1`.
- Sostituito `transition-all duration-500` con `transition-colors duration-200` (solo per transizioni colore, es. focus ring).

### 3.3 Sfondo

- Un solo div di sfondo con gradiente fisso `from-primary-600 to-violet-700`, `opacity-95`, senza `transition-opacity` né `group-hover:opacity-100`.

### 3.4 Icona centrale

- Rimosse dal cerchio: `group-hover:scale-110 transition-transform duration-300`.

---

## 4. Come funziona (comportamento)

- La CTA non ha più animazioni al passaggio del mouse: niente rettangolo che scorre, niente sollevamento, niente ingrandimento dell’icona.
- Restano: focus ring per accessibilità (`focus:ring-4 focus:ring-primary-500/30`) e aspetto visivo stabile.

---

## 5. Riepilogo file

| File | Modifiche |
|------|-----------|
| `extra-tracker/src/features/dashboard/pages/DashboardPage.tsx` | Rimosso div shine; rimosse animazioni hover da bottone, sfondo e icona; transizione ridotta a `transition-colors duration-200`. |

---

# 3. Preferenze – Rimozione campo Valuta e analisi PreferencesSettings

**Data e ora:** 22 febbraio 2025 (session)

---

## 1. Richiesta

- **Rimuovere** dalla pagina Preferenze (Impostazioni) il campo **Valuta** (Euro, Dollar, Pound, CHF), che non è più utilizzato.
- **Analizzare** il componente delle preferenze per individuare problemi di codice/UX e correggerli.

---

## 2. Modifiche al codice

### 2.1 Rimozione campo Valuta

**File:** `extra-tracker/src/features/settings/components/PreferencesSettings.tsx`

- Rimosso il blocco `SettingsSelect` per "Valuta" (name `currency`, opzioni EUR/USD/GBP/CHF).
- Rimosso `DollarSign` dagli import di lucide-react.
- Rimosso `'currency'` dall’array `autoSaveFields` (auto-save dopo 2 secondi).

**File:** `extra-tracker/src/features/settings/components/SettingsSearch.tsx`

- Rimossa dalla lista di ricerca la voce `{ id: 'currency', label: 'Valuta', ... }`.

**Nota:** Il tipo `UserPreferences` in `settingsService.ts` e il default `currency: 'EUR'` in `SettingsContext.tsx` sono stati **lasciati invariati** per compatibilità con l’API/backend (il valore continua a essere inviato/ricevuto, ma non è più modificabile dall’UI).

### 2.2 Correzioni emerse dall’analisi (PreferencesSettings)

1. **Layout anteprima tema**
   - L’anteprima tema era il terzo elemento in un grid a 2 colonne e occupava solo la prima colonna.
   - Aggiunta la classe **`md:col-span-2`** al `motion.div` dell’anteprima, così occupa tutta la larghezza sotto i due select (Lingua e Tema).

2. **Reset e timer auto-save**
   - Nel click su "Reset" veniva chiamato `clearTimeout(autoSaveTimer)` ma non `setAutoSaveTimer(null)`.
   - Aggiunto **`setAutoSaveTimer(null)`** dopo `clearTimeout(autoSaveTimer)` nel reset, così lo stato del timer è coerente dopo il reset.

---

## 3. Analisi del componente PreferencesSettings

### Cosa va bene

- **useEffect per sync `preferences` → `formData`**: uso corretto di useEffect per sincronizzare con stato esterno (preferenze dal context). Allineato alle linee guida (sync con sistemi esterni).
- **Auto-save con timer**: il timer viene riavviato a ogni modifica dei campi auto-save; il timer precedente viene annullato con `clearTimeout(autoSaveTimer)` prima di creare il nuovo. Nessun doppio salvataggio.
- **Cleanup del timer**: l’`useEffect` con dipendenza `[autoSaveTimer]` fa cleanup (clearTimeout) al cambio di `autoSaveTimer` o allo unmount, evitando timer “dimenticati”.
- **Submit e Reset**: il pulsante "Salva modifiche" è disabilitato quando `!hasChanges || status.loading`; il Reset ripristina `preferences` e azzera `hasChanges` (e ora anche il timer).

### Possibili miglioramenti futuri (non applicati)

- **Type safety in `handleChange`**: oggi si usa `[name]: value as never` perché `name` è `string` e `value` è `string`, mentre `UserPreferences` ha union types (es. `theme: 'dark'|'light'|'system'`). Si potrebbe tipizzare `name` come `keyof UserPreferences` e restringere `value` in base al campo (es. con un map o type guard) per evitare `as never`.
- **Ref per il timer**: tenere il timer in un `useRef` invece che in uno state eviterebbe un re-render a ogni cambio timer; la cleanup andrebbe comunque fatta in un `useEffect` con cleanup on unmount. Non necessario per il comportamento attuale, solo ottimizzazione.

---

## 4. Riepilogo file

| File | Modifiche |
|------|-----------|
| `extra-tracker/src/features/settings/components/PreferencesSettings.tsx` | Rimosso campo Valuta (SettingsSelect + import DollarSign + 'currency' da autoSaveFields); anteprima tema con `md:col-span-2`; reset con `setAutoSaveTimer(null)` dopo clearTimeout. |
| `extra-tracker/src/features/settings/components/SettingsSearch.tsx` | Rimossa voce di ricerca "Valuta" (id: currency). |

---

# 4. Barra di ricerca Impostazioni – stile Apple (light/dark)

**Data e ora:** 22 febbraio 2025 (session)

---

## 1. Richiesta

Migliorare il componente che mostra "Cerca CtrlK" nell’header delle Impostazioni: trasformarlo in una **barra di ricerca stile Apple**, ben leggibile e coerente sia in **light theme** che in **dark theme**.

---

## 2. Modifiche al codice

**File:** `extra-tracker/src/features/settings/pages/SettingsPage.tsx`

Il pulsante di ricerca nell’header è stato sostituito con una barra stilizzata come campo di ricerca (ancora un `<button>` che apre il modal di ricerca).

### 2.1 Aspetto e layout

- **Forma**: `rounded-full` (pill) per un look tipo Spotlight/Apple.
- **Dimensioni**: `min-w-[220px]` su mobile, `sm:min-w-[280px]` su schermi più grandi; padding `pl-4 pr-3 py-2.5`.
- **Contenuto**: icona Search a sinistra, testo "Cerca nelle impostazioni" al centro (troncato se necessario), shortcut `⌘K` / `Ctrl+K` a destra (nascosto su schermi molto piccoli, `hidden sm:inline-flex`).

### 2.2 Tema light/dark (CSS variables)

Tutti i colori usano le variabili del tema (`var(--...)`) così la barra si adatta al tema attuale:

- **Sfondo**: `bg-[var(--bg-input)]`, hover `hover:bg-[var(--bg-surface-hover)]`.
- **Bordo**: `border-[var(--border-subtle)]`, hover `hover:border-[var(--border-default)]`.
- **Testo**: `text-[var(--text-muted)]`, hover `hover:text-[var(--text-secondary)]`.
- **Ombra**: `shadow-[var(--shadow-sm)]`.
- **Shortcut (kbd)**: `bg-[var(--bg-surface)]`, `text-[var(--text-muted)]`, `border-[var(--border-subtle)]`.

Nessun colore hardcoded (es. `white/50`): in light theme il testo e lo sfondo sono scuri/chiari corretti, in dark restano chiari su scuro.

### 2.3 Interazione e accessibilità

- **Hover**: transizione su background, bordo e colore testo (`transition-[...] duration-200`).
- **Focus**: `focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:ring-offset-2` per stato focus visibile.
- **Micro-interazione**: `whileHover={{ scale: 1.01 }}`, `whileTap={{ scale: 0.99 }}` (Framer Motion).
- **Backdrop**: `backdrop-blur-sm` per un effetto “frosted” leggero.
- **Aria**: `aria-label="Cerca nelle impostazioni (Ctrl+K)"`.
- **Shortcut**: `navigator.platform?.includes('Mac')` per mostrare `⌘` su macOS e `Ctrl` altrove (con check `typeof navigator !== 'undefined'` per SSR).

---

## 3. Riepilogo file

| File | Modifiche |
|------|-----------|
| `extra-tracker/src/features/settings/pages/SettingsPage.tsx` | Sostituito il pulsante "Cerca" + kbd con una barra di ricerca stile Apple: pill rounded-full, variabili CSS per light/dark, hover/focus, shortcut ⌘K/Ctrl+K, aria-label. |

---

# 5. Impostazioni – Titolo e indicatore attivo in violet/primary (solo Light theme)

**Data e ora:** 22 febbraio 2025 (session)

---

## 1. Richiesta

Con **tema Light**, due elementi dovevano usare il colore **viola/primary** (come il pulsante FAB “Segnala un problema” – gradiente primary → violet):

1. **Titolo “Impostazioni”** nell’header della pagina Impostazioni (h1 con gradiente bianco).
2. **Pallino indicatore attivo** nella sidebar delle Impostazioni (il cerchietto bianco accanto alla tab attiva).

In Dark theme il comportamento resta invariato (titolo bianco, pallino bianco).

---

## 2. Modifiche al codice

### 2.1 Classi aggiunte

- **SettingsPage.tsx**: sull’`h1` “Impostazioni” è stata aggiunta la classe **`settings-page-title`** (oltre alle classi esistenti per gradiente bianco e clip-text).
- **ModernSettingsLayout.tsx**: sul `motion.div` del pallino attivo è stata aggiunta la classe **`settings-sidebar-active-dot`** (oltre a `w-2 h-2 rounded-full bg-white shadow-...`).

### 2.2 CSS per Light theme (index.css)

Solo in **`[data-theme="light"]`**:

- **`.settings-page-title`**
  - `background`: gradiente lineare `linear-gradient(to right, var(--primary-500), var(--primary-600))`.
  - `-webkit-background-clip: text` e `background-clip: text`, `color: transparent` per il testo “tagliato” dal gradiente (stesso effetto del titolo, ma viola invece di bianco).

- **`.settings-sidebar-active-dot`**
  - `background`: gradiente `linear-gradient(135deg, var(--primary-500), var(--primary-600))` (stile FAB).
  - `box-shadow`: `0 0 10px rgba(124, 58, 237, 0.5)` per un leggero glow viola.

Le regole usano `!important` per prevalere sulle classi Tailwind/inline già presenti sugli elementi.

---

## 3. Riepilogo file

| File | Modifiche |
|------|-----------|
| `extra-tracker/src/features/settings/pages/SettingsPage.tsx` | Aggiunta classe `settings-page-title` all’h1 “Impostazioni”. |
| `extra-tracker/src/features/settings/components/layout/ModernSettingsLayout.tsx` | Aggiunta classe `settings-sidebar-active-dot` al pallino indicatore della tab attiva. |
| `extra-tracker/src/index.css` | Aggiunte regole `[data-theme="light"] .settings-page-title` e `[data-theme="light"] .settings-sidebar-active-dot` con gradiente primary/violet e shadow. |

---

# 6. Impostazioni – Gruppo Undo/Redo stile Apple (light/dark)

**Data e ora:** 22 febbraio 2025 (session)

---

## 1. Richiesta

Rendere il gruppo **Undo/Redo** (i due pulsanti Annulla / Ripristina nell’header delle Impostazioni) più curato e coerente con la **barra di ricerca** già creata: stesso stile “Apple”, adattato a light e dark theme.

---

## 2. Modifiche al codice

**File:** `extra-tracker/src/features/settings/pages/SettingsPage.tsx`

### 2.1 Contenitore (wrapper)

- **Prima:** `rounded-xl bg-white/[0.04] border border-white/[0.08]` (colori fissi dark).
- **Dopo:** stile allineato alla barra di ricerca:
  - **Forma:** `rounded-full` (pill).
  - **Sfondo e bordo:** `bg-[var(--bg-input)]`, `border-[var(--border-subtle)]`, hover `hover:bg-[var(--bg-surface-hover)]`, `hover:border-[var(--border-default)]`.
  - **Ombra:** `shadow-[var(--shadow-sm)]`.
  - **Backdrop:** `backdrop-blur-sm`.
  - **Transizione:** `transition-[background-color,border-color] duration-200`.
- Spaziatura: `gap-0.5 p-1` per mantenere i due pulsanti vicini in una pill unica.

### 2.2 Pulsanti Undo e Redo

- **Prima:** `text-white/50 hover:text-white hover:bg-white/[0.08]`, `rounded-lg`.
- **Dopo:**
  - **Colori:** `text-[var(--text-muted)]`, hover `hover:text-[var(--text-secondary)]`, `hover:bg-[var(--bg-surface)]` (theme-aware).
  - **Forma:** `rounded-full`, `p-2.5`.
  - **Focus:** `focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:ring-inset`.
  - **Micro-interazione:** `whileHover={{ scale: 1.08 }}`, `whileTap={{ scale: 0.95 }}` (prima 1.1 / 0.9).
- Aggiunti `type="button"`, `aria-label` (“Annulla (Ctrl+Z)” / “Ripristina (Ctrl+Shift+Z)”).

### 2.3 Divisore tra i pulsanti

- **Prima:** `w-px h-4 bg-white/10`.
- **Dopo:** `w-px h-4 bg-[var(--border-subtle)]` + `aria-hidden` per il tema e l’accessibilità.

---

## 3. Riepilogo file

| File | Modifiche |
|------|-----------|
| `extra-tracker/src/features/settings/pages/SettingsPage.tsx` | Gruppo Undo/Redo: contenitore pill theme-aware (var CSS), pulsanti con colori e focus theme-aware, divisore con var(--border-subtle), aria-label. |

---

# 7. Modal Cerca impostazioni – Animazioni fluide e centratura

**Data e ora:** 22 febbraio 2025 (session)

---

## 1. Richiesta

Il modal di ricerca nelle impostazioni (Ctrl+K) andava già bene come stile; da sistemare:

1. **Animazioni** – apertura/chiusura fluide, senza scatti; transizione del blur dello sfondo più morbida.
2. **Posizione** – modal **al centro dello schermo** (verticale e orizzontale), non più in alto con `pt-20`.

---

## 2. Modifiche al codice

### 2.1 Centratura (SettingsSearch.tsx)

- **Wrapper del modal:** da `flex items-start justify-center pt-20 px-4` a **`flex items-center justify-center p-4`**.
- Il modal è ora centrato verticalmente e orizzontalmente; `p-4` mantiene margine su tutti i lati.

### 2.2 Animazioni (SettingsSearch.tsx)

- **Rimosso** il `if (!isOpen) return null` così il componente resta montato durante l’uscita e AnimatePresence può eseguire l’animazione di chiusura.
- **Overlay (backdrop):**
  - Transizione esplicita: `transition={{ type: 'tween', duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}`.
  - `initial` / `animate` / `exit`: solo `opacity` (0 → 1 → 0) per evitare scatti.
- **Card (contenuto):**
  - Valori: `initial={{ opacity: 0, scale: 0.96, y: 12 }}`, `animate={{ opacity: 1, scale: 1, y: 0 }}`, `exit={{ opacity: 0, scale: 0.96, y: 12 }}`.
  - Transizione: `type: 'tween'`, `duration: 0.28`, stessa ease, `delay: 0.02` per leggerissimo ritardo sull’entrata.
- Scale e `y` leggermente ridotti (0.96, 12px) per un movimento più morbido rispetto a 0.95 e -20px.

### 2.3 AnimatePresence nel parent (SettingsPage.tsx)

- **Search Modal** avvolto in **`<AnimatePresence mode="wait">`** e reso condizionato con `{isSearchOpen && <SettingsSearch key="settings-search-modal" ... />}`.
- In chiusura, AnimatePresence tiene il modal in DOM fino al termine di `exit`, così l’animazione di uscita viene sempre riprodotta e non scompare a scatto.

---

## 3. Riepilogo file

| File | Modifiche |
|------|-----------|
| `extra-tracker/src/features/settings/components/SettingsSearch.tsx` | Centratura (`items-center justify-center p-4`); rimosso early return; transizioni tween su overlay e card; valori initial/animate/exit con scale 0.96 e y 12. |
| `extra-tracker/src/features/settings/pages/SettingsPage.tsx` | Modal Cerca avvolto in `AnimatePresence mode="wait"` con key `settings-search-modal` per uscita fluida. |

---

# 8. Modal Cerca – Overlay opaco e animazioni semplificate

**Data e ora:** 22 febbraio 2025 (session)

---

## 1. Richiesta

Il modal di ricerca appariva male: **si vedevano ancora gli elementi sotto** (overlay trasparente), poi si chiudeva con l’animazione in modo poco chiaro. Da sistemare: overlay che copra subito lo sfondo e animazioni più pulite (o rifatte da zero).

---

## 2. Modifiche al codice

**File:** `extra-tracker/src/features/settings/components/SettingsSearch.tsx`

### 2.1 Overlay opaco

- **Problema:** L’overlay aveva solo `opacity` animata e **nessuno sfondo** (`fixed inset-0` senza `bg-*`), quindi il contenuto dietro restava visibile anche a modal aperto.
- **Soluzione:** Aggiunto **`bg-black/70 backdrop-blur-sm`** al wrapper `fixed inset-0`. Quando l’overlay è a `opacity: 1`, lo sfondo è scuro e copre completamente la pagina; il blur rende la transizione meno brusca.

### 2.2 Animazioni semplificate

- **Overlay:** Transizione `duration: 0.2`, ease `[0.32, 0.72, 0, 1]` (entrata/uscita più decisa).
- **Card (contenuto):**
  - Rimosso lo spostamento verticale (`y: 12` / `y: 0`) per evitare “salti”.
  - Solo **scale + opacity**: `initial={{ opacity: 0, scale: 0.94 }}`, `animate={{ opacity: 1, scale: 1 }}`, `exit={{ opacity: 0, scale: 0.94 }}`.
  - Transizione `duration: 0.25`, stessa ease, **rimosso il delay** così overlay e card animano insieme.
- Risultato: apertura e chiusura più lineari, senza vedere gli elementi sotto durante l’animazione.

---

## 3. Riepilogo file

| File | Modifiche |
|------|-----------|
| `extra-tracker/src/features/settings/components/SettingsSearch.tsx` | Overlay con `bg-black/70 backdrop-blur-sm`; animazione card solo scale + opacity (niente y); transizioni e ease aggiornate; rimosso delay. |

---

# 9. Modal Cerca – Input e pulsanti theme-aware + pulsanti a rettangolo tondo

**Data e ora:** 22 febbraio 2025 (session)

---

## 1. Richiesta

1. **Input di ricerca:** Con **tema light** il testo deve essere **nero** (come il resto dell’app), non bianco.
2. **Pulsanti suggerimento** (password, tema, lingua, esporta): dare forma da **rettangolo tondo** (angoli ben arrotondati).

---

## 2. Modifiche al codice

**File:** `extra-tracker/src/features/settings/components/SettingsSearch.tsx`

### 2.1 Input e header bar theme-aware

- **Input:** `text-white` e `placeholder-white/40` sostituiti con **`style={{ color: 'var(--text-primary)' }}`** e **`placeholder-[var(--text-placeholder)]`** → in light theme testo e placeholder neri/grigi, in dark bianchi.
- **Icona Search:** da `text-white/50` a **`style={{ color: 'var(--text-muted)' }}`**.
- **Testo "Esc per chiudere" e kbd:** da `text-white/40` e `bg-white/[0.1]` a **`style={{ color: 'var(--text-muted)' }}`** e **`bg-[var(--bg-surface)] border-[var(--border-subtle)]`**; bordo header **`border-[var(--border-subtle)]`**.

### 2.2 Pulsanti suggerimento a rettangolo tondo

- **Forma:** da **`rounded-lg`** a **`rounded-2xl`** (rettangolo tondo).
- **Tema:** da colori fissi (`bg-white/[0.05]`, `text-white/60`, hover `bg-white/[0.1]`, `text-white`) a variabili CSS: **`bg-[var(--bg-surface)]`**, **`text-[var(--text-muted)]`**, **`hover:bg-[var(--bg-surface-hover)]`**, **`hover:text-[var(--text-primary)]`**, **`border border-[var(--border-subtle)]`**.
- **Dettaglio:** `px-4 py-2`, **`font-medium`**, **`type="button"`**.

---

## 3. Riepilogo file

| File | Modifiche |
|------|-----------|
| `extra-tracker/src/features/settings/components/SettingsSearch.tsx` | Input e header bar con var(--text-primary), placeholder, icona e “Esc” theme-aware; pulsanti suggerimento con rounded-2xl e colori da variabili CSS. |
