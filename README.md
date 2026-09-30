# To You, in 2,000 Years

A small desktop-first pixel-art exploration game about shared memories. It is a static site: no build step or packages are required.

## Run it

For a local URL during development, run:

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
  // fit: "cover", // Optional. The default keeps the full photo visible.
},
```

Opening that shrine reveals the card and permanently adds it to the browser inventory. The small grid button in the upper-right corner of the map opens every discovered card again. A missing or empty image list still works and displays a framed placeholder until photos are ready.

Photos use `contain` by default, so portrait and wide images are never cropped. The remaining space uses the dark card background. Add `fit: "cover"` only when you deliberately want an image to fill the frame and accept cropping.

## Publish with GitHub Pages

This repository includes a workflow that publishes the game whenever you push to `main`.

1. Push the project to GitHub.
2. On GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Open the **Actions** tab and wait for **Deploy to GitHub Pages** to finish.
5. GitHub will show the game URL in the workflow summary. Send that link to her.

The site runs over a normal `https://` URL, so the collision map and keyboard exploration work without Live Server. A GitHub Pages URL is public to anyone who has it; do not publish personal photos there unless you are comfortable with that.
