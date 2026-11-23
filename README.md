# REPORTpro — פיקוח עליון ובקרה הנדסית

Single-file web app for authoring **engineering supervision / inspection reports** (Hebrew, RTL) in the traffic & road‑safety domain. Create a report, add zones (junctions/areas) and defects with photos, then print or export a branded PDF. Everything runs client‑side — no server, no accounts, data stays on the device.

**Live:** https://mbbtower4-boop.github.io/REPORTpro/ · **Repo:** https://github.com/mbbtower4-boop/REPORTpro

> This README is the project reference for future development. It reflects **v1.36.0**.

---

## Quick facts

| | |
|---|---|
| **Type** | Single-file vanilla-JS web app (SPA), Hebrew RTL |
| **Main file** | `REPORTpro.html` — **the entire app** (CSS + HTML + JS, ~1,400 lines) |
| **`index.html`** | Tiny redirect → `REPORTpro.html` (so the folder-root URL and PWA `start_url` work) |
| **Build step** | **None.** No frameworks, bundler, linter, or tests. Edit the HTML, open in a browser. |
| **Dependencies** | Google Fonts (Heebo/Rubik) always; html2canvas + jsPDF loaded from CDN **only** when exporting PDF |
| **Storage** | IndexedDB (`carmin_reports`), with in-memory fallback for `file://` |
| **Deploy** | Push to `main` → GitHub Pages (Deploy from a branch: `main` / root) |

---

## Running & developing

- **Open the app:** double-click `REPORTpro.html`, or visit the live URL.
  - ⚠️ From `file://` many browsers block IndexedDB → the app auto-falls back to **in-memory mode** and shows a banner asking you to use **Backup/Restore**. For persistent storage use the live URL (or serve over `http://`).
- **Local preview over http** (gets you IndexedDB + a realistic environment):
  ```bash
  # from the repo folder
  python -m http.server 5599      # then open http://localhost:5599/
  # or:  npx --yes serve -l 5599
  ```
- **Edit:** change `REPORTpro.html` directly. There is nothing to compile.
- **Deploy:** commit and `git push origin main`. GitHub Pages rebuilds automatically (~1–3 min).

---

## Architecture

Classic vanilla-JS SPA driven by a single global `state` object and a `render()` router.

- **Views:** `home` (archive) · `edit` · `print` · `templates` · `templateEdit`. Each view builds HTML from a `*HTML()` function and is injected via `app.innerHTML = ...`. Interactions are inline `onclick="globalFn(...)"` attributes.
- **Data model:**
  ```
  Report → zones[] (אזורים) → defects[] (ליקויים) → { images[], description, severity, category }
  ```
  Plus **folders** (projects) and **templates** (branding: logo, colors, client details, engineer/signature defaults, sizes).
- **Persistence:** `DB` wraps IndexedDB stores `reports` / `folders` / `templates`. The in-memory `memStore` is used **only** when IndexedDB is unavailable (e.g. `file://`, or a failure mid-session — then it is seeded from the already-loaded state). `normalizeReports()` runs on load/import to guard against malformed data and migrate old records. At startup the app requests `navigator.storage.persist()`.
- **Copies:** use `deepClone()` (copies structure, shares the photo strings) — never `JSON.parse(JSON.stringify())`, which re-copies every photo.
- **Offline:** `sw.js` service worker — network-first for app files, cache-first (precached) for fonts and the PDF libraries, so the app opens and exports PDFs with no connection. Bump its `CACHE` name only when `sw.js` itself changes.
- **Autosave:** `scheduleAutosave()` (debounced ~1.2 s) and `autosaveNow()` (immediate) run while editing and on `visibilitychange` / `pagehide` / `beforeunload` / leaving the editor — but **write only if the content changed**: `snapOf()` snapshots the report (photos as cheap fingerprints, `imgFP`) and is compared with `savedSnap` (`markClean()` sets it when a report is opened). This keeps `updatedAt` honest, which backup-restore relies on (newer copy wins). `updateSaveStatus()` drives the on-screen indicator.
- **Editor rendering:** thumbnails use cached `blob:` URLs (`thumbURL`, released on leaving the editor); the print view keeps self-contained `data:` URLs. Single-defect actions call `rerenderDefect()` (keeps focus/caret) instead of a full `render()`.
- **Images:** captured via camera / gallery / paste / drag, processed by `compressImage()` → JPEG data URLs stored in `defect.images[]`. `compressImage` decodes with `createImageBitmap({imageOrientation:"from-image"})` (fixes rotated iPhone photos) and falls back to `FileReader` + `<img>`; HEIC decode failures show a clear message.
- **PDF export:** `exportPDF()` (html2canvas + jsPDF, lazy-loaded/precached) lays `#printDoc` out at a **fixed 760 px width**, first computes all page breaks from DOM geometry (breaks only between blocks; each zone starts a page; the closing block = summary + signature + footer always stays together), then renders **each page separately at scale 3 (~300 DPI)** via an off-screen clipped copy of the document. Per-page rendering keeps canvases small (iOS Safari fails above ~16 MP). Falls back to `window.print()` if the libs can't load.
- **Backup/restore:** restore imports reports (an existing one only if the backup copy is newer), adds missing folders, and **never overwrites local templates** (adds a missing one only if an imported report uses it). Home shows "last backup" status (`rp_lastBackupAt` in localStorage) and warns after 2 days with unbacked changes.
- **Lightbox:** a delegated document click on any `.thumb` / `.doc-img` opens a full-screen viewer with prev/next (no inline handlers, so exported report HTML stays static).

### Where things live (function index)

| Area | Key functions |
|---|---|
| State / routing | `state`, `render()`, `go()` |
| Archive (home) | `homeHTML`, `filteredSortedReports`, `archiveCardHTML`, `archiveGridHTML`, `onArchiveSearch/Sort` |
| Editor | `editHTML`, `zoneHTML`, `defectHTML`, `bindEdit`; `addZone/moveZone/delZone`, `addDefect/moveDefect/dupDefect/delDefect` |
| Images | `compressImage`, `drawToJpeg`, `handleFile`, `applyPaste`, `pickImg`, `clearImg`, `moveDefectImage`, `defectImages`, drag: `defectDragStart` |
| Templates | `templatesHTML`, `templateEditHTML`, `bindTemplateEdit`, `saveTemplate` |
| Print / PDF | `printHTML`, `exportPDF`, `loadPdfLibs`, `saveBlob`; lightbox: `openLightbox/renderLightbox/lbNav/closeLightbox` |
| Persistence | `DB`, `memStore`, `deepClone`, `snapOf/markClean`, `autosaveNow`, `scheduleAutosave`, `updateSaveStatus`, `normalizeReports` |
| Backup status | `backupStatusHTML`, `markBackedUp`, `lsGet/lsSet` |
| Backup / share | `exportData`, import handler, `shareMenu`, `downloadApp`, `saveReportFile`, `buildAppFile`, `buildReportFile` |

---

## Features (v1.36.0)

- Reports with zones and defects; **multiple photos per defect** (add via camera/gallery/paste/drag; multi-file pick; per-photo remove & reorder)
- Severity (high/medium/low) and category tags per defect
- **Folders/projects** and **graphic templates** (logo, colors, client & engineer details, signature, element sizes)
- **Archive search & sort** (title / location / date / defect count)
- **Reorder defects** (drag handle + up/down) and **duplicate defect**
- **Autosave** with a live save-status indicator
- **Direct PDF export** (no browser print dialog, ~300 DPI, works offline) + classic print
- **Offline mode** (service worker) and persistent-storage request
- **New report continues the previous one** (selected card, else latest in folder): details, zone titles and summary pre-filled
- Delete confirmation for areas/defects with content
- **Photo lightbox** (tap to zoom, prev/next, ESC/arrows)
- **HEIC / EXIF-orientation** handling for phone photos
- Backup/Restore (JSON), Share (Web Share API), Download-app, Save single report as standalone HTML
- Installable as a PWA (manifest + "Add to Home Screen"); light-mode UI by design

---

## Conventions (follow these for every change)

- **Versioning:** bump the `APP_VERSION` constant **and** prepend a dated entry to the `CHANGELOG` array (both near the top of the script). Patch for fixes, minor for features. The version is shown in the header button and in the changelog dialog.
- **Escaping:** render all user/text values through `esc()` / `escMulti()`; image `src` values are escaped too.
- **Language:** Hebrew RTL UI, Hebrew code comments, Hebrew CHANGELOG entries.
- **Data model:** photos live in `defect.images[]` (array). Legacy `defect.image` (single) is auto-migrated by `defectImages()` + `normalizeReports()` — don't reintroduce the single field.
- **`index.html`:** if `REPORTpro.html` is ever renamed, update the redirect.

---

## Gotchas & lessons

- **`file://` blocks IndexedDB** → app runs in in-memory/backup mode by design. Use the live URL or `http://` for real persistence.
- **PDF libs** come from cdnjs (precached by the service worker for offline use). No SRI on the CDN scripts yet (potential hardening).
- **html2canvas crop options (`x`/`y`/`height`) don't map cleanly to element coordinates** — that's why per-page rendering uses an off-screen `overflow:hidden` frame with a shifted copy of the document instead.
- **Cut points:** cut 2–3 px past a block's bottom / before a block's top, otherwise a sliver of its border leaks onto the neighbouring page.
- **GitHub Pages deploy failing with "Timeout reached, aborting!"** = a **transient GitHub-side Pages incident**, not a repo/code problem (the build + artifact upload succeed; only the publish step times out). Check the **Pages** component at https://www.githubstatus.com; once it's *operational*, re-push to `main` or use **Actions → Re-run failed jobs**. **Do not** delete/recreate the repo — a new repo hits the same shared Pages service. (This happened on 2026-07-02; resolved by waiting for recovery + re-push.)

---

## Roadmap / ideas (not yet done)

- Drag to reorder photos **within** a defect (currently up/down only)
- SRI on the CDN scripts (or vendor them)
- Store photos in a separate IndexedDB store so the archive doesn't load every photo into memory
- Optional cloud sync / multi-device (currently local-only by design)

---

*Single-file, local-first, privacy-focused. Built as a field tool for real inspection work.*
