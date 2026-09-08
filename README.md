# To You, in 2,000 Years

A small desktop-first pixel-art exploration game about shared memories. It is a static site: no build step, packages, or server are required.

## Run it

Open `index.html` in a browser. For a local URL during development, run:

```powershell
py -m http.server 4173
```

Then open `http://localhost:4173`.

## Add a memory

1. Put a compressed image in `assets/memories/`, for example `assets/memories/mytilene.jpg`.
2. Edit the matching entry in `data/memories.js`.
3. Set `image` to `"assets/memories/mytilene.jpg"`, then replace the `body` and `note` text.

The map and interactions are in `game.js`. Every entry in `data/memories.js` is intentionally self-contained so new material can be added gradually.

## First-draft puzzle and landmarks

- The dock lantern: the start of the first week in Mytilene.
- The observatory: Tenerife and a shared song, star, or late-night detail.
- The quiet gate: replace the current moon-flower-star code with an inside joke before the final version.
- The four shrines: Mytilene, Tenerife, Florence, and Summer 2026.

## Publishing later

The GitHub repository is private. GitHub Pages is usually public for personal accounts, so do not enable it until you choose a hosting/privacy approach. Netlify or Vercel can deploy this static project with access restrictions; another option is making the repository public only when the personal images have been removed or you are comfortable with them being reachable by URL.
