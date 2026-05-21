# BotC Storyteller Companion

An unofficial, single-device web app for the Storyteller (game master) of
**Blood on the Clocktower**. Runs fully offline as a PWA. No accounts, no
networking, no server.

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

Pull and run the pre-built image:

```bash
docker run -p 8080:80 nouayne/botc-storyteller
# open http://localhost:8080
```

Build and push yourself:

```bash
docker build -t nouayne/botc-storyteller .
docker push nouayne/botc-storyteller
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

---

## Data & licensing

`roles.json` is vendored from [bra1n/townsquare](https://github.com/bra1n/townsquare)
(MIT licence; night-reminder text by Ben Finney).

*Blood on the Clocktower*, its characters, and artwork are © Steven Medway /
The Pandemonium Institute. This is an unofficial personal tool; no artwork is
bundled.
