# To You, in 2,000 Years

A small desktop-first pixel-art exploration game about shared memories. It is a static site: no build step or packages are required.

## Run it

Open `index.html` in a browser. For a local URL during development, run:

```powershell
py -m http.server 4173
```

Then open `http://localhost:4173`.

## Hub map

`background_1.png` is the first map. The player begins at the campsite in the lower-left area. The train, boat, and airplane are active routes that will later lead to their own maps and memories.

The static pixel art is rendered on the canvas and stays intact. `game.js` layers small animations above it: sea and lake glints, waterfall movement, campfire flicker, and route markers.

## Adding memories and maps

The first four memory entries live in `data/memories.js`; their prose and images can be completed gradually. A new route map can follow the same pattern:

1. Add its pixel-art image as `background_2.png`, `background_3.png`, and so on.
2. Add a route target and its spawn point in `game.js`.
3. Place its photos in `assets/memories/` and reference them from `data/memories.js`.

## Publishing later

The GitHub repository is private. GitHub Pages may require a public repository depending on the GitHub plan, and published Pages sites are public. Decide on the hosting/privacy approach once the personal photos are in place.
