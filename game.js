(() => {
  "use strict";

  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const startScreen = document.querySelector("#start-screen");
  const travelModal = document.querySelector("#puzzle-modal");
  const travelEyebrow = document.querySelector("#puzzle-modal .eyebrow");
  const travelTitle = document.querySelector("#puzzle-title");
  const travelText = document.querySelector("#travel-text");
  const travelStatus = document.querySelector("#puzzle-status");
  const travelActions = document.querySelector("#travel-actions");
  const confirmTravel = document.querySelector("#confirm-travel");
  const cancelTravel = document.querySelector("#cancel-travel");
  const prompt = document.querySelector("#prompt");
  const keys = new Set();

  const state = {
    running: false,
    modalOpen: true,
    swimming: false,
    lastTime: 0,
    pendingAction: null,
  };

  const mapImage = new Image();
  const collisionNotesImage = new Image();
  const player = { x: 190, y: 456, size: 26, speed: 118, direction: "right" };
  const routePoints = [
    { id: "campfire", x: 144, y: 453, label: "The campsite", title: "The campsite", body: "This is where the map begins. The first memory can live here when you are ready to write it.", status: "A quiet beginning." },
    { id: "train", x: 128, y: 68, label: "The train", title: "The train is waiting.", body: "This route will lead to a future map. We can decide together which memory belongs behind this station.", status: "Destination not drawn yet." },
    { id: "boat", x: 864, y: 283, label: "The boat", title: "The boat is tied to the dock.", body: "This route will become a separate place to explore, with its own memories and small secrets.", status: "Destination not drawn yet." },
    { id: "plane", x: 770, y: 577, label: "The airplane", title: "The airplane has not left yet.", body: "This route will take us somewhere further away. For now, it stays here as a promise of the next chapter.", status: "Destination not drawn yet." },
  ];
  const shrineLocations = [
    [653, 183], [269, 188], [391, 198], [690, 266], [81, 294],
    [656, 321], [186, 351], [286, 374], [58, 391], [751, 423],
    [527, 451], [411, 458], [822, 453], [613, 548], [639, 578],
  ];

  let collision = null;
  const shrines = shrineLocations.map(([x, y], index) => ({ x, y, id: `shrine-${index + 1}`, number: index + 1 }));

  const seaWaves = [[908, 42, 12], [928, 91, 9], [899, 157, 14], [929, 214, 10], [903, 337, 13], [932, 421, 10], [906, 512, 14], [932, 586, 9], [868, 510, 12], [875, 388, 8]];
  const lakeGlints = [[392, 333], [470, 354], [531, 379], [415, 424], [503, 443], [356, 394]];
  const waterfallFrames = [[327, 148], [332, 183], [339, 224], [345, 266], [375, 502], [379, 545], [382, 602]];

  function indexAt(x, y) {
    return y * canvas.width + x;
  }

  function expandMask(source, radius) {
    const destination = new Uint8Array(source.length);
    const offsets = [];
    for (let y = -radius; y <= radius; y += 1) {
      for (let x = -radius; x <= radius; x += 1) {
        if (x * x + y * y <= radius * radius) offsets.push([x, y]);
      }
    }
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        if (!source[indexAt(x, y)]) continue;
        offsets.forEach(([offsetX, offsetY]) => {
          const targetX = x + offsetX;
          const targetY = y + offsetY;
          if (targetX >= 0 && targetX < canvas.width && targetY >= 0 && targetY < canvas.height) destination[indexAt(targetX, targetY)] = 1;
        });
      }
    }
    return destination;
  }

  function paintDisc(mask, centerX, centerY, radius) {
    for (let y = Math.floor(centerY - radius); y <= Math.ceil(centerY + radius); y += 1) {
      for (let x = Math.floor(centerX - radius); x <= Math.ceil(centerX + radius); x += 1) {
        if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height && (x - centerX) ** 2 + (y - centerY) ** 2 <= radius ** 2) mask[indexAt(x, y)] = 1;
      }
    }
  }

  function paintConnection(mask, fromX, fromY, toX, toY, radius) {
    const steps = Math.ceil(Math.hypot(toX - fromX, toY - fromY));
    for (let step = 0; step <= steps; step += 2) {
      const progress = step / steps;
      paintDisc(mask, fromX + (toX - fromX) * progress, fromY + (toY - fromY) * progress, radius);
    }
  }

  function clearMaskArea(mask, left, top, width, height) {
    const right = Math.min(canvas.width, left + width);
    const bottom = Math.min(canvas.height, top + height);
    for (let y = Math.max(0, top); y < bottom; y += 1) {
      for (let x = Math.max(0, left); x < right; x += 1) mask[indexAt(x, y)] = 0;
    }
  }

  function simplifyRightSea(walkable, swimmable) {
    // The freehand sea annotation had several small islands. Replace it with one connected swim area.
    clearMaskArea(swimmable, 790, 250, 170, 350);
    paintDisc(swimmable, 839, 358, 23);
    paintConnection(swimmable, 839, 358, 880, 365, 30);
    paintDisc(swimmable, 890, 365, 67);
    paintDisc(swimmable, 890, 440, 72);
    paintDisc(swimmable, 892, 522, 47);

    // A short piece of shore connects the main path to a deliberate swim entrance.
    paintDisc(walkable, 799, 356, 12);
    paintConnection(walkable, 775, 340, 799, 356, 9);
  }

  function prepareCollisionMap() {
    if (!mapImage.complete || !collisionNotesImage.complete || !mapImage.naturalWidth || !collisionNotesImage.naturalWidth) return;
    const referenceCanvas = document.createElement("canvas");
    const notesCanvas = document.createElement("canvas");
    referenceCanvas.width = notesCanvas.width = canvas.width;
    referenceCanvas.height = notesCanvas.height = canvas.height;
    const referenceContext = referenceCanvas.getContext("2d", { willReadFrequently: true });
    const notesContext = notesCanvas.getContext("2d", { willReadFrequently: true });
    referenceContext.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
    notesContext.drawImage(collisionNotesImage, 0, 0, canvas.width, canvas.height);
    const reference = referenceContext.getImageData(0, 0, canvas.width, canvas.height).data;
    const notes = notesContext.getImageData(0, 0, canvas.width, canvas.height).data;
    const path = new Uint8Array(canvas.width * canvas.height);
    const water = new Uint8Array(canvas.width * canvas.height);
    const shrine = new Uint8Array(canvas.width * canvas.height);

    for (let pixel = 0; pixel < path.length; pixel += 1) {
      const color = pixel * 4;
      const redChange = notes[color] - reference[color];
      const greenChange = notes[color + 1] - reference[color + 1];
      const blueChange = notes[color + 2] - reference[color + 2];
      if (redChange > 30 && blueChange > 50) path[pixel] = 1;
      if (redChange > 35 && greenChange > 15 && blueChange < -30) water[pixel] = 1;
      if (greenChange < -30 && blueChange < 40 && redChange < 20) shrine[pixel] = 1;
    }

    const walkable = expandMask(path, 4);
    const swimmable = expandMask(water, 3);
    const shrineZones = expandMask(shrine, 2);
    for (let pixel = 0; pixel < walkable.length; pixel += 1) {
      if (shrineZones[pixel]) walkable[pixel] = 1;
    }
    // The hand-drawn paths deliberately stop just short of the station and runway art.
    paintDisc(walkable, 128, 68, 21);
    paintConnection(walkable, 128, 68, 180, 91, 11);
    paintDisc(walkable, 770, 577, 23);
    paintConnection(walkable, 655, 550, 770, 577, 11);
    paintDisc(walkable, 864, 283, 20);
    simplifyRightSea(walkable, swimmable);
    collision = { walkable, swimmable, shrineZones };
    const spawn = nearestMaskedPoint(player.x, player.y, collision.walkable);
    player.x = spawn.x;
    player.y = spawn.y;
  }

  function isOnMask(mask, x, y) {
    if (!mask) return false;
    const testX = Math.round(x);
    const testY = Math.round(y);
    return testX >= 0 && testX < canvas.width && testY >= 0 && testY < canvas.height && Boolean(mask[indexAt(testX, testY)]);
  }

  function nearestMaskedPoint(x, y, mask) {
    if (isOnMask(mask, x, y)) return { x, y };
    for (let radius = 1; radius < 180; radius += 1) {
      for (let offset = -radius; offset <= radius; offset += 2) {
        const candidates = [[x - radius, y + offset], [x + radius, y + offset], [x + offset, y - radius], [x + offset, y + radius]];
        const point = candidates.find(([candidateX, candidateY]) => isOnMask(mask, candidateX, candidateY));
        if (point) return { x: point[0], y: point[1] };
      }
    }
    return { x, y };
  }

  function isNearMask(mask, x, y, distance) {
    for (let offsetY = -distance; offsetY <= distance; offsetY += 2) {
      for (let offsetX = -distance; offsetX <= distance; offsetX += 2) {
        if (offsetX * offsetX + offsetY * offsetY <= distance * distance && isOnMask(mask, x + offsetX, y + offsetY)) return true;
      }
    }
    return false;
  }

  function drawWaterAnimation(time) {
    const phase = Math.floor(time / 240) % 5;
    ctx.save();
    ctx.globalAlpha = 0.54;
    ctx.fillStyle = "#d9f2ea";
    seaWaves.forEach(([x, y, width], index) => ctx.fillRect(x + ((phase + index * 2) % 5), y, width, 2));
    ctx.globalAlpha = 0.38;
    lakeGlints.forEach(([x, y], index) => ctx.fillRect(x + ((phase + index) % 4), y, index % 2 ? 5 : 8, 2));
    ctx.globalAlpha = 0.55;
    waterfallFrames.forEach(([x, y], index) => {
      const drift = (phase + index) % 4;
      ctx.fillRect(x + drift, y, 3, 7);
      ctx.fillRect(x - 2 + drift, y + 5, 2, 4);
    });
    ctx.restore();
  }

  function drawCampfire(time) {
    const flicker = Math.floor(time / 120) % 3;
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#f5b957";
    ctx.fillRect(133 - flicker, 444 - flicker, 22 + flicker * 2, 22 + flicker * 2);
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = "#ffcf66";
    ctx.fillRect(141, 446 - flicker, 6, 9 + flicker);
    ctx.fillStyle = "#f36b3f";
    ctx.fillRect(142, 451, 4, 7);
    ctx.fillStyle = "#fff0a8";
    ctx.fillRect(143, 447 - flicker, 2, 4);
    ctx.restore();
  }

  function drawRouteMarker(point, time) {
    const pulse = Math.floor(time / 330) % 3;
    const y = point.y - 25 - pulse;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#fff2a3";
    ctx.fillRect(point.x - 2, y, 5, 5);
    ctx.fillRect(point.x - 5, y + 2, 11, 1);
    ctx.fillRect(point.x, y - 3, 1, 11);
    ctx.restore();
  }

  function drawPlayer(time) {
    const x = Math.round(player.x - player.size / 2);
    const y = Math.round(player.y - player.size / 2);
    const bob = Math.floor(time / 220) % 2;
    if (state.swimming) {
      ctx.save();
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = "#d8f1e9";
      ctx.fillRect(x - 4, y + 14 + bob, 10, 2);
      ctx.fillRect(x + 18, y + 14 + bob, 10, 2);
      ctx.fillRect(x - 1, y + 18 + bob, 30, 2);
      ctx.restore();
      ctx.fillStyle = "#3d2932";
      ctx.fillRect(x + 7, y + 5 + bob, 12, 6);
      ctx.fillStyle = "#f2be9d";
      ctx.fillRect(x + 8, y + 8 + bob, 10, 9);
      ctx.fillStyle = "#b64f47";
      ctx.fillRect(x + 6, y + 16 + bob, 15, 5);
      return;
    }
    ctx.save();
    ctx.globalAlpha = 0.48;
    ctx.fillStyle = "#152127";
    ctx.fillRect(x + 4, y + 24, 18, 3);
    ctx.restore();
    ctx.fillStyle = "#1e2730";
    ctx.fillRect(x + 5, y + 10, 16, 15);
    ctx.fillStyle = "#b64f47";
    ctx.fillRect(x + 4, y + 8, 18, 13);
    ctx.fillStyle = "#f2be9d";
    ctx.fillRect(x + 8, y + 3, 10, 8);
    ctx.fillStyle = "#3d2932";
    ctx.fillRect(x + 7, y, 12, 5);
    ctx.fillStyle = "#dce8d1";
    ctx.fillRect(x + 3, y + 13, 3, 8);
    ctx.fillStyle = "#f4dc88";
    if (player.direction === "left") ctx.fillRect(x + 2, y + 10, 3, 3);
    if (player.direction === "right") ctx.fillRect(x + 21, y + 10, 3, 3);
    ctx.fillStyle = "#fff0a8";
    ctx.fillRect(x + 11, y - 8 - bob, 4, 4);
    ctx.fillRect(x + 9, y - 6 - bob, 8, 1);
    ctx.fillRect(x + 12, y - 10 - bob, 1, 8);
  }

  function draw(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!mapImage.complete || !mapImage.naturalWidth) {
      ctx.fillStyle = "#243b3c";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#f4d987";
      ctx.font = "20px Georgia";
      ctx.fillText("Loading the map...", 40, 60);
      return;
    }
    ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
    drawWaterAnimation(time);
    drawCampfire(time);
    routePoints.filter((point) => point.id !== "campfire").forEach((point) => drawRouteMarker(point, time));
    drawPlayer(time);
  }

  function nearestRoutePoint() {
    return routePoints.find((point) => Math.hypot(player.x - point.x, player.y - point.y) < 36) || null;
  }

  function nearestShrine() {
    return shrines.find((shrine) => Math.hypot(player.x - shrine.x, player.y - shrine.y) < 30) || null;
  }

  function interactionAtPlayer() {
    const shrine = nearestShrine();
    if (shrine && !state.swimming) return { type: "shrine", value: shrine };
    if (state.swimming && isNearMask(collision?.walkable, player.x, player.y, 22)) return { type: "shore" };
    if (!state.swimming && isNearMask(collision?.swimmable, player.x, player.y, 24)) return { type: "swim" };
    const route = nearestRoutePoint();
    if (route && !state.swimming) return { type: "route", value: route };
    return null;
  }

  function refreshPrompt() {
    if (!state.running || state.modalOpen) return;
    const interaction = interactionAtPlayer();
    if (interaction?.type === "shrine") prompt.textContent = `E · Memory shrine ${interaction.value.number}`;
    else if (interaction?.type === "swim") prompt.textContent = "E · Go for a swim?";
    else if (interaction?.type === "shore") prompt.textContent = "E · Return to shore?";
    else if (interaction?.type === "route") prompt.textContent = `E · ${interaction.value.label}`;
    else prompt.textContent = state.swimming ? "Swim through the marked water." : "Follow the marked paths.";
  }

  function showModal({ eyebrow, title, body, status, action = null }) {
    state.modalOpen = true;
    state.pendingAction = action;
    travelEyebrow.textContent = eyebrow;
    travelTitle.textContent = title;
    travelText.textContent = body;
    travelStatus.textContent = status;
    travelActions.hidden = !action;
    travelModal.classList.add("is-visible");
    travelModal.setAttribute("aria-hidden", "false");
  }

  function closeTravelModal() {
    travelModal.classList.remove("is-visible");
    travelModal.setAttribute("aria-hidden", "true");
    travelActions.hidden = true;
    state.pendingAction = null;
    state.modalOpen = false;
    refreshPrompt();
  }

  function openInteraction(interaction) {
    if (interaction.type === "swim") {
      showModal({ eyebrow: "The water is calling", title: "Go for a swim?", body: "The marked water is safe to explore. You can return to shore whenever you find a path.", status: "", action: "enter-water" });
      return;
    }
    if (interaction.type === "shore") {
      showModal({ eyebrow: "Back to the path", title: "Return to shore?", body: "The next part of the journey is waiting on land.", status: "", action: "leave-water" });
      return;
    }
    if (interaction.type === "shrine") {
      showModal({ eyebrow: "A memory is waiting", title: `Memory shrine ${interaction.value.number}`, body: "This shrine is reserved for one of your memories. When you choose what belongs here, it can open a photo, a note, a sound, or a small scene.", status: "Not written yet." });
      return;
    }
    const point = interaction.value;
    showModal({ eyebrow: point.id === "campfire" ? "The first page" : "A route to another map", title: point.title, body: point.body, status: point.status });
  }

  function confirmAction() {
    if (state.pendingAction === "enter-water") {
      const waterSpawn = nearestMaskedPoint(player.x, player.y, collision.swimmable);
      player.x = waterSpawn.x;
      player.y = waterSpawn.y;
      state.swimming = true;
    }
    if (state.pendingAction === "leave-water") {
      const shoreSpawn = nearestMaskedPoint(player.x, player.y, collision.walkable);
      player.x = shoreSpawn.x;
      player.y = shoreSpawn.y;
      state.swimming = false;
    }
    closeTravelModal();
  }

  function move(delta) {
    if (!collision) return;
    let dx = 0;
    let dy = 0;
    if (keys.has("arrowup") || keys.has("w")) dy -= 1;
    if (keys.has("arrowdown") || keys.has("s")) dy += 1;
    if (keys.has("arrowleft") || keys.has("a")) dx -= 1;
    if (keys.has("arrowright") || keys.has("d")) dx += 1;
    if (!dx && !dy) return;
    if (dx) player.direction = dx < 0 ? "left" : "right";
    if (dy) player.direction = dy < 0 ? "up" : "down";
    const length = Math.hypot(dx, dy);
    const targetX = player.x + (dx / length) * player.speed * delta;
    const targetY = player.y + (dy / length) * player.speed * delta;
    const movementMask = state.swimming ? collision.swimmable : collision.walkable;
    if (isOnMask(movementMask, targetX, player.y)) player.x = targetX;
    if (isOnMask(movementMask, player.x, targetY)) player.y = targetY;
  }

  function gameLoop(time) {
    const delta = Math.min((time - state.lastTime) / 1000, 0.05);
    state.lastTime = time;
    if (state.running && !state.modalOpen) move(delta);
    refreshPrompt();
    draw(time);
    requestAnimationFrame(gameLoop);
  }

  mapImage.onload = prepareCollisionMap;
  collisionNotesImage.onload = prepareCollisionMap;
  mapImage.src = "background_1.png";
  collisionNotesImage.src = "background_1_collision_notes.png";

  document.querySelector("#start-button").addEventListener("click", () => {
    startScreen.classList.add("is-hidden");
    state.modalOpen = false;
    state.running = true;
    refreshPrompt();
  });
  document.querySelector("#close-puzzle").addEventListener("click", closeTravelModal);
  confirmTravel.addEventListener("click", confirmAction);
  cancelTravel.addEventListener("click", closeTravelModal);

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    const controlKeys = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", "e", "enter", "escape"];
    if (controlKeys.includes(key)) event.preventDefault();
    if (key === "escape" && travelModal.classList.contains("is-visible")) {
      closeTravelModal();
      return;
    }
    if ((key === "e" || key === "enter") && state.running && !state.modalOpen) {
      const interaction = interactionAtPlayer();
      if (interaction) openInteraction(interaction);
      return;
    }
    if (!state.modalOpen) keys.add(key);
  });
  window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
  window.addEventListener("blur", () => keys.clear());

  requestAnimationFrame(gameLoop);
})();
