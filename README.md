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

`background_1_collision_notes.png` is an invisible gameplay layer. Magenta marks walkable paths, gold marks swimmable water, and burgundy marks memory shrines. The game compares it with the visible map at runtime, so the annotation is never displayed to the player.

The static pixel art is rendered on the canvas and stays intact. `game.js` layers small animations above it: sea and lake glints, waterfall movement, campfire flicker, and route markers.

## Adding memories and maps

Memory entries live in `data/memories.js`; their prose and images can be completed gradually. A new route map can follow the same pattern:

1. Add its pixel-art image as `background_2.png`, `background_3.png`, and so on.
2. Add a route target and its spawn point in `game.js`.
3. Place its photos in `assets/memories/` and reference them from `data/memories.js`.

### Add a memory card

1. Choose one of the 15 shrine numbers on the hub map.
2. Create a folder such as `assets/memories/mytilene-first-week/` and place your photos there as `01.jpg`, `02.jpg`, and so on.
3. Add or edit an entry in `data/memories.js`:

```js
{
  id: "mytilene-first-week",
  shrine: 1,
  title: "The first week in Mytilene",
  place: "Mytilene",
  text: "Your message for her goes here.",
  images: [
    "assets/memories/mytilene-first-week/01.jpg",
    "assets/memories/mytilene-first-week/02.jpg",
  ],
},
```

Opening that shrine reveals the card and permanently adds it to the browser inventory. The small grid button in the upper-right corner of the map opens every discovered card again. A missing or empty image list still works and displays a framed placeholder until photos are ready.

## Publishing later

The GitHub repository is private. GitHub Pages may require a public repository depending on the GitHub plan, and published Pages sites are public. Decide on the hosting/privacy approach once the personal photos are in place.
