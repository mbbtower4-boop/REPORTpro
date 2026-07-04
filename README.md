# REPORTpro — פיקוח עליון ובקרה הנדסית

Single-file web app for authoring **engineering supervision / inspection reports** (Hebrew, RTL) in the traffic & road‑safety domain. Create a report, add zones (junctions/areas) and defects with photos, then print or export a branded PDF. Everything runs client‑side — no server, no accounts, data stays on the device.

**Live:** https://mbbtower4-boop.github.io/REPORTpro/ · **Repo:** https://github.com/mbbtower4-boop/REPORTpro

> This README is the project reference for future development. It reflects **v1.26.0**.

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
- **Persistence:** `DB` wraps IndexedDB stores `reports` / `folders` / `templates`. If IndexedDB fails or is blocked (e.g. `file://`), it transparently uses the in-memory `memStore`. `normalizeReports()` runs on load/import to guard against malformed data and migrate old records.
- **Autosave:** `scheduleAutosave()` (debounced ~1.2 s) and `autosaveNow()` (immediate) save while editing and on `visibilitychange` / `pagehide` / `beforeunload` / leaving the editor. `updateSaveStatus()` drives the on-screen save indicator.
- **Images:** captured via camera / gallery / paste / drag, processed by `compressImage()` → JPEG data URLs stored in `defect.images[]`. `compressImage` decodes with `createImageBitmap({imageOrientation:"from-image"})` (fixes rotated iPhone photos) and falls back to `FileReader` + `<img>`; HEIC decode failures show a clear message.
- **PDF export:** `exportPDF()` lazy-loads html2canvas + jsPDF from cdnjs, renders `#printDoc` at a **fixed 760 px width** (device-independent), rasterizes and paginates on block boundaries so defects/photos aren't cut mid-page, and saves a PDF **without the print dialog**. If the libs can't load (offline) it falls back to `window.print()`.
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
| Persistence | `DB`, `memStore`, `persist`, `autosaveNow`, `scheduleAutosave`, `updateSaveStatus`, `normalizeReports` |
| Backup / share | `exportData`, import handler, `shareMenu`, `downloadApp`, `saveReportFile`, `buildAppFile`, `buildReportFile` |

---

## Features (v1.26.0)

- Reports with zones and defects; **multiple photos per defect** (add via camera/gallery/paste/drag; multi-file pick; per-photo remove & reorder)
- Severity (high/medium/low) and category tags per defect
- **Folders/projects** and **graphic templates** (logo, colors, client & engineer details, signature, element sizes)
- **Archive search & sort** (title / location / date / defect count)
- **Reorder defects** (drag handle + up/down) and **duplicate defect**
- **Autosave** with a live save-status indicator
- **Direct PDF export** (no browser print dialog) + classic print
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
- **PDF needs network** (CDN libs); offline it falls back to print. No SRI on the CDN scripts yet (potential hardening).
- **GitHub Pages deploy failing with "Timeout reached, aborting!"** = a **transient GitHub-side Pages incident**, not a repo/code problem (the build + artifact upload succeed; only the publish step times out). Check the **Pages** component at https://www.githubstatus.com; once it's *operational*, re-push to `main` or use **Actions → Re-run failed jobs**. **Do not** delete/recreate the repo — a new repo hits the same shared Pages service. (This happened on 2026-07-02; resolved by waiting for recovery + re-push.)

---

## Roadmap / ideas (not yet done)

- Drag to reorder photos **within** a defect (currently up/down only)
- Fully offline PDF (vendor the libs or add a self-contained generator) and/or SRI on the CDN scripts
- Optional cloud sync / multi-device (currently local-only by design)

---

*Single-file, local-first, privacy-focused. Built as a field tool for real inspection work.*
