(() => {
  "use strict";

  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const startScreen = document.querySelector("#start-screen");
  const travelModal = document.querySelector("#puzzle-modal");
  const travelTitle = document.querySelector("#puzzle-title");
  const travelEyebrow = document.querySelector("#puzzle-modal .eyebrow");
  const travelText = document.querySelector(".puzzle-card > p:not(.eyebrow):not(.puzzle-status)");
  const travelStatus = document.querySelector("#puzzle-status");
  const prompt = document.querySelector("#prompt");
  const keys = new Set();

  const state = {
    running: false,
    modalOpen: true,
    lastTime: 0,
  };

  const mapImage = new Image();
  mapImage.src = "background_1.png";

  const player = {
    x: 190,
    y: 456,
    size: 26,
    speed: 118,
    direction: "right",
  };

  const pointsOfInterest = [
    {
      id: "campfire",
      x: 144,
      y: 453,
      label: "The campsite",
      title: "The campsite",
      body: "This is where the map begins. The first memory can live here when you are ready to write it.",
      status: "A quiet beginning.",
      kind: "campfire",
    },
    {
      id: "train",
      x: 128,
      y: 68,
      label: "The train",
      title: "The train is waiting.",
      body: "This route will lead to a future map. We can decide together which memory belongs behind this station.",
      status: "Destination not drawn yet.",
      kind: "route",
    },
    {
      id: "boat",
      x: 864,
      y: 283,
      label: "The boat",
      title: "The boat is tied to the dock.",
      body: "This route will become a separate place to explore, with its own memories and its own small secrets.",
      status: "Destination not drawn yet.",
      kind: "route",
    },
    {
      id: "plane",
      x: 770,
      y: 577,
      label: "The airplane",
      title: "The airplane has not left yet.",
      body: "This route will take us somewhere further away. For now, it stays here as a promise of the next chapter.",
      status: "Destination not drawn yet.",
      kind: "route",
    },
  ];

  const blockedAreas = [
    { x: 322, y: 304, width: 234, height: 156 },
    { x: 890, y: 0, width: 70, height: 640 },
    { x: 326, y: 126, width: 34, height: 183 },
    { x: 365, y: 475, width: 27, height: 165 },
  ];

  const seaWaves = [
    [908, 42, 12], [928, 91, 9], [899, 157, 14], [929, 214, 10], [903, 337, 13],
    [932, 421, 10], [906, 512, 14], [932, 586, 9], [868, 510, 12], [875, 388, 8],
  ];
  const lakeGlints = [[392, 333], [470, 354], [531, 379], [415, 424], [503, 443], [356, 394]];
  const waterfallFrames = [[327, 148], [332, 183], [339, 224], [345, 266], [375, 502], [379, 545], [382, 602]];

  function pointInRect(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  }

  function isBlocked(x, y) {
    const padding = player.size / 2;
    if (x < padding || y < padding || x > canvas.width - padding || y > canvas.height - padding) return true;
    return blockedAreas.some((area) => pointInRect(x, y, area));
  }

  function drawWaterAnimation(time) {
    const phase = Math.floor(time / 240) % 5;
    ctx.save();
    ctx.globalAlpha = 0.54;
    ctx.fillStyle = "#d9f2ea";
    seaWaves.forEach(([x, y, width], index) => {
      const offset = (phase + index * 2) % 5;
      ctx.fillRect(x + offset, y, width, 2);
    });

    ctx.globalAlpha = 0.38;
    lakeGlints.forEach(([x, y], index) => {
      const width = index % 2 ? 5 : 8;
      ctx.fillRect(x + ((phase + index) % 4), y, width, 2);
    });

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
    const markerBob = Math.floor(time / 240) % 2;
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
    ctx.fillRect(x + 11, y - 8 - markerBob, 4, 4);
    ctx.fillRect(x + 9, y - 6 - markerBob, 8, 1);
    ctx.fillRect(x + 12, y - 10 - markerBob, 1, 8);
  }

  function draw(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (mapImage.complete && mapImage.naturalWidth) {
      ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
      drawWaterAnimation(time);
      drawCampfire(time);
      pointsOfInterest.filter((point) => point.kind === "route").forEach((point) => drawRouteMarker(point, time));
      drawPlayer(time);
      return;
    }
    ctx.fillStyle = "#243b3c";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f4d987";
    ctx.font = "20px Georgia";
    ctx.fillText("Loading the map...", 40, 60);
  }

  function nearestPointOfInterest() {
    return pointsOfInterest.find((point) => Math.hypot(player.x - point.x, player.y - point.y) < 38) || null;
  }

  function refreshPrompt() {
    if (!state.running || state.modalOpen) return;
    const point = nearestPointOfInterest();
    prompt.textContent = point ? `E · ${point.label}` : "Follow the paths.";
  }

  function openPointOfInterest(point) {
    state.modalOpen = true;
    travelEyebrow.textContent = point.kind === "campfire" ? "The first page" : "A route to another map";
    travelTitle.textContent = point.title;
    travelText.textContent = point.body;
    travelStatus.textContent = point.status;
    travelModal.classList.add("is-visible");
    travelModal.setAttribute("aria-hidden", "false");
  }

  function closeTravelModal() {
    travelModal.classList.remove("is-visible");
    travelModal.setAttribute("aria-hidden", "true");
    state.modalOpen = false;
    refreshPrompt();
  }

  function move(delta) {
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
    if (!isBlocked(targetX, player.y)) player.x = targetX;
    if (!isBlocked(player.x, targetY)) player.y = targetY;
  }

  function gameLoop(time) {
    const delta = Math.min((time - state.lastTime) / 1000, 0.05);
    state.lastTime = time;
    if (state.running && !state.modalOpen) move(delta);
    refreshPrompt();
    draw(time);
    requestAnimationFrame(gameLoop);
  }

  document.querySelector("#start-button").addEventListener("click", () => {
    startScreen.classList.add("is-hidden");
    state.modalOpen = false;
    state.running = true;
    refreshPrompt();
  });
  document.querySelector("#close-puzzle").addEventListener("click", closeTravelModal);

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    const controlKeys = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", "e", "enter", "escape"];
    if (controlKeys.includes(key)) event.preventDefault();
    if (key === "escape" && travelModal.classList.contains("is-visible")) {
      closeTravelModal();
      return;
    }
    if ((key === "e" || key === "enter") && state.running && !state.modalOpen) {
      const point = nearestPointOfInterest();
      if (point) openPointOfInterest(point);
      return;
    }
    if (!state.modalOpen) keys.add(key);
  });
  window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
  window.addEventListener("blur", () => keys.clear());

  requestAnimationFrame(gameLoop);
})();
