# BotC Storyteller Companion

An unofficial, single-device web app for the Storyteller (game master) of
**Blood on the Clocktower**. Runs fully offline as a PWA. No accounts, no
networking, no server.

## Features

- **Grimoire** — seat players, drag-and-drop to reorder, assign roles
  (manually or randomized per the correct team composition), track life/death,
  ghost votes, and reminder tokens. A hide/show toggle blanks roles for
  screen-sharing.
- **Script** — import a custom script JSON or pick a bundled base script
  (Trouble Brewing, Sects & Violets, Bad Moon Rising).
- **Night** — step-by-step first-night / other-night order built from the
  script and current players, with per-role reminder text and quick-access
  info sheets for roles that need one.
- **Day** — nominations, vote tracking (with ghost votes), and execution
  threshold/resolution.
- **Library** — create custom homebrew roles, edit official role text,
  import community translations, and manage reusable player-info templates.
- **Tools** — player info sheets/statements, demon bluffs, setup composition
  helper, icon base URL config, and game-state export/import/reset.
- **Log** — chronological event log with manual annotations, exportable as
  plain text.
- **Presentation mode** — fullscreen overlay for showing info to a player.

---

## Quick start

```bash
npm install
npm run dev        # dev server at http://localhost:5173
npm run build      # production build → dist/
npm run preview    # serve the dist build locally
npm test           # run unit tests
```

## Install as PWA

After `npm run build`:

1. Serve the `dist/` folder via any static host (or `npm run preview`).
2. Open the URL in Chrome/Edge on desktop or Safari on iOS/iPadOS.
3. **Desktop Chrome/Edge:** click the install icon in the address bar.
   **iOS Safari:** Share → Add to Home Screen.

The service worker pre-caches all assets. Once installed, the app works with
no network connection.

## Docker

Build the image locally with the bundled `docker-compose.yml` (serves on port `32768`):

```bash
docker compose up -d
# open http://localhost:32768
```

Or build and run manually:

```bash
docker build -t botc-storyteller .
docker run -p 8080:80 botc-storyteller
# open http://localhost:8080
```

---

## Importing a script

1. Go to the **Script** tab.
2. Click **Import JSON…** or drop a `.json` file anywhere on the panel.
3. Alternatively, pick one of the three built-in scripts (Trouble Brewing,
   Sects & Violets, Bad Moon Rising).

### Bundled scripts

Drop a script JSON file into `public/scripts/` and register it in
`public/scripts/index.json`:

```json
["my_script.json"]
```

The app fetches and loads all listed scripts on startup; they appear as
one-click buttons in the Script Manager.

Script JSON must follow the [BotC Script Tool schema][schema]:

- An array where the first element may be a `_meta` object.
- Official characters as bare strings (`"washerwoman"`) or `{ "id": "..." }`.
- Homebrew characters as full objects matching the `roles.json` shape.

[schema]: https://github.com/ThePandemoniumInstitute/botc-release/blob/main/script-schema.json

## Importing a translation

1. Go to the **Library** tab.
2. Click **Import translation…** and select a `.json` file.
3. The language switcher (row of buttons) will show the new locale.
4. Click it to apply — all role text in the Grimoire, night runner, and
   pickers updates immediately.

### Translation file format

```jsonc
{
  "locale": "fr",
  "name": "Français",
  "roles": {
    "washerwoman": {
      "name": "Lavandière",
      "ability": "Tu sais qu'une personne parmi deux est un Villageois précis.",
      "reminders": ["Villageois", "Faux"],
      "firstNightReminder": "...",
      "otherNightReminder": ""
    }
    // add more role ids...
  }
}
```

Partial translations are fine — any missing field falls back to English per-field.
The importer also accepts the alternative flat-array shape
`[ { "id": "...", "name": "...", ... }, ... ]`.

## Creating custom roles

1. Go to the **Library** tab and click **+ New custom role**.
2. Fill in the form. The **ID** must be unique lowercase slug (letters, digits,
   underscores).
3. Save. The role appears in the library and in the character picker.
4. Click **Export custom roles** to get a JSON file importable into other BotC
   tools (standard custom-script character shape).

## Icon base URL

By default, icons are loaded from the bra1n/townsquare GitHub repo at runtime.
To use local assets (or a self-hosted folder), go to **Tools → Config** and
enter a base URL ending in `/`. Icons are resolved as:

```text
<base_url><role_id>.png
```

e.g. `http://localhost:8080/icons/` → `http://localhost:8080/icons/imp.png`.

If an icon fails to load, a team-coloured fallback badge with the character's
initials is shown instead.

## Game state & log export

**Tools → Config** also has:

- **Export/Import game** — save the full game state (players, roles,
  nominations, log, etc.) as JSON, or load it back in.
- **New game (keep players & script)** — resets roles, tokens, and notes but
  keeps the current seating and script.
- **New game (full reset)** — clears everything.

The **Log** tab lets you export the event log as a plain-text file.

---

## Data & licensing

`roles.json` is vendored from [bra1n/townsquare](https://github.com/bra1n/townsquare)
(MIT licence; night-reminder text by Ben Finney).

*Blood on the Clocktower*, its characters, and artwork are © Steven Medway /
The Pandemonium Institute. This is an unofficial personal tool; no artwork is
bundled.
