# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Vite dev server (hot reload)
npm run build      # Production build → build/
npm run preview    # Preview production build locally
npm run deploy     # Build + deploy via gh-pages
```

No test suite is configured. There is no linter configured beyond Vite's defaults.

## Architecture

This is a single-page React 19 app (Vite + Tailwind CSS) for the Café Theater Festival timetable. All app logic lives in one large component: **`src/App.jsx` → `AppContent`**. There is no router — navigation is purely state-driven.

### Data flow

All data comes from **Appwrite** (cloud backend). On startup:
1. Cache is read from `localStorage` key `ctfAppwriteCache` and applied immediately (stale-while-revalidate).
2. `fetchDataFromAppwrite()` fetches 11 collections in parallel and joins them in memory into a flat `timetableData` array.
3. Every 2 minutes a background refresh runs.

The joining logic (companies → performances → locations → executions) happens entirely client-side inside `fetchDataFromAppwrite`. Collection IDs are in `src/config/appwrite.js`.

### Navigation model

There is no URL router. State variables control what is shown:
- `currentView` — `'timetable' | 'favorites' | 'friends-favorites' | 'more-info' | 'accessibility'`
- `activePerformance` — non-null renders `PerformanceDetailPage` (overrides `currentView`)
- `activeInfoPage` — non-null renders `InfoDetailPage`
- `activeRoute` — non-null renders a route detail view inline in `renderMainContent`
- Deep links via `?fav_indices=` (base64 indices) or `/:slug` path segments are resolved in the `init` useEffect against the loaded data.

### Notifications

Two notification systems run in parallel:
- **Performance notifications** — scheduled via `scheduleActualNotification` when a performance is favorited. Uses `window.AndroidBridge.scheduleNativeNotification` if available (WebView), otherwise `setTimeout` + Web Notifications API.
- **General notifications** — fetched from a GitHub Gist JSON (`ldegroen.github.io/ctf-notificaties/notifications.json`) after data loads.

### Text rendering / content

Rich text from Appwrite uses a custom BBCode-like syntax (`[b]`, `[i]`, `[u]`, `[button:label:url]`, `[foto:url]`, `[h1]`/`[h2]`/`[h3]` suffixes). All rendering passes through DOMPurify with an allowlist. Key functions in `src/utils/textRenderers.jsx`:
- `applyFormatting` — BBCode → sanitized HTML (used with `dangerouslySetInnerHTML`)
- `CustomTextRenderer` — full rich text renderer used in content popups
- `renderPrivacyPolicyContent` / `renderGenericPopupText` — specific layout renderers

### Feedback / toasts vs dialogs

- **Simple feedback** (success, error): `toast()` / `toast.success()` / `toast.error()` from **sonner**. `<Toaster>` is mounted in `AppContent`. Import `toast` directly in any component that needs it.
- **Confirmation dialogs** (with action buttons): `showMessageBox(message, buttons[])` which drives the `<MessageBox>` component. Keep this only for dialogs that need user choices.

### Key localStorage keys

| Key | Purpose |
|-----|---------|
| `ctfAppwriteCache` | Full Appwrite data cache with timestamp |
| `ctfTimetableFavorites` | JSON array of favorited performance IDs |
| `ctfFriendsFavorites` | JSON array of imported friends' favorites IDs |
| `appLanguage` | `'nl'` or `'en'` |
| `cookieConsent` | `'all'` / `'functional'` / `'declined'` |
| `ctfScheduledCustomNotifications` | Set of scheduled general notification IDs |

### Bilingual (NL/EN)

All user-facing strings come from `src/config/translations.js`. Access via `translations[language].common.key` or `translations[language].genres.key`. The `language` state is `'nl'` (default) or `'en'`.

### Icons

- **UI icons**: `lucide-react` — `Heart`, `Calendar`, `Share2`, `MapPin`, `ChevronDown`, `ChevronLeft`, `Search`, `Filter`.
- **Safety/accessibility icons**: External PNG images from `media.cafetheaterfestival.nl`, defined in `src/utils/icons.js` as `getSafetyIcons()`.

### Android WebView bridge

The app runs inside a native Android WebView. `window.AndroidBridge` is injected by the native app and exposes methods like `scheduleNativeNotification`, `saveFavoritesForReboot`, `openExactAlarmSettings`. Always guard with `window.AndroidBridge?.method` before calling.

### File extension convention

Files containing JSX must use the `.jsx` extension. Plain utility/config files without JSX use `.js`. Vite is configured (`vite.config.js`) to handle both, but `.jsx` is the correct convention for new component files.
