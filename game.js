(() => {
  "use strict";

  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const startScreen = document.querySelector("#start-screen");
  const memoryModal = document.querySelector("#memory-modal");
  const puzzleModal = document.querySelector("#puzzle-modal");
  const memoryCount = document.querySelector("#memory-count");
  const memoryTotal = document.querySelector("#memory-total");
  const prompt = document.querySelector("#prompt");
  const memoryImage = document.querySelector("#memory-image");
  const memoryPlace = document.querySelector("#memory-place");
  const memoryTitle = document.querySelector("#memory-title");
  const memoryBody = document.querySelector("#memory-body");
  const memoryNote = document.querySelector("#memory-note");
  const puzzleStatus = document.querySelector("#puzzle-status");

  const tile = 24;
  const columns = canvas.width / tile;
  const rows = canvas.height / tile;
  const keys = new Set();
  const seenMemories = new Set(JSON.parse(localStorage.getItem("to-you-seen-memories") || "[]"));
  const state = {
    running: false,
    modalOpen: true,
    gateOpen: localStorage.getItem("to-you-gate-open") === "true",
    runeInput: [],
    lastTime: 0,
  };

  const player = { x: 6.5 * tile, y: 18.5 * tile, size: 15, speed: 130, direction: "down" };
  const memories = window.MEMORIES.map((memory, index) => ({
    ...memory,
    x: [8, 15, 29, 34][index] * tile + tile / 2,
    y: [18, 8, 7, 17][index] * tile + tile / 2,
  }));

  memoryTotal.textContent = String(memories.length);
  updateMemoryCount();

  function saveProgress() {
    localStorage.setItem("to-you-seen-memories", JSON.stringify([...seenMemories]));
    localStorage.setItem("to-you-gate-open", String(state.gateOpen));
  }

  function updateMemoryCount() {
    memoryCount.textContent = String(seenMemories.size);
  }

  function inRect(x, y, left, top, width, height) {
    return x >= left && x < left + width && y >= top && y < top + height;
  }

  function terrainAt(tx, ty) {
    if (tx <= 0 || ty <= 0 || tx >= columns - 1 || ty >= rows - 1) return "tree";
    if (tx < 5 && ty < 20) return "water";
    if (tx === 5 && ty >= 14 && ty <= 20) return "bridge";
    if (inRect(tx, ty, 6, 17, 10, 3) || inRect(tx, ty, 14, 8, 3, 12) || inRect(tx, ty, 14, 7, 15, 3) || inRect(tx, ty, 28, 7, 3, 11) || inRect(tx, ty, 28, 16, 8, 3)) return "path";
    if (tx === 25 && ty >= 9 && ty <= 12 && !state.gateOpen) return "gate";
    if ((tx === 3 && ty > 20) || (tx === 11 && ty === 13) || (tx === 12 && ty === 13) || (tx === 26 && ty === 14) || (tx === 37 && ty < 7)) return "tree";
    if ((tx * 17 + ty * 11) % 23 === 0) return "flowers";
    return "grass";
  }

  function isBlocked(x, y) {
    const samples = [
      [x - player.size / 2, y - player.size / 2],
      [x + player.size / 2, y - player.size / 2],
      [x - player.size / 2, y + player.size / 2],
      [x + player.size / 2, y + player.size / 2],
    ];
    return samples.some(([sampleX, sampleY]) => {
      const terrain = terrainAt(Math.floor(sampleX / tile), Math.floor(sampleY / tile));
      return terrain === "water" || terrain === "tree" || terrain === "gate";
    });
  }

  function drawTile(tx, ty, terrain, time) {
    const x = tx * tile;
    const y = ty * tile;
    ctx.fillStyle = "#537851";
    ctx.fillRect(x, y, tile, tile);

    if (terrain === "grass" || terrain === "flowers") {
      ctx.fillStyle = (tx + ty) % 2 ? "#4c724e" : "#5a8055";
      ctx.fillRect(x, y, tile, tile);
      ctx.fillStyle = "#3f6846";
      ctx.fillRect(x + 4, y + 6, 2, 3);
      ctx.fillRect(x + 16, y + 15, 2, 3);
      if (terrain === "flowers") {
        ctx.fillStyle = "#f4d780";
        ctx.fillRect(x + 10, y + 10, 3, 3);
        ctx.fillStyle = "#c66169";
        ctx.fillRect(x + 8, y + 10, 2, 2);
        ctx.fillRect(x + 13, y + 10, 2, 2);
      }
    }

    if (terrain === "path") {
      ctx.fillStyle = "#b89967";
      ctx.fillRect(x, y, tile, tile);
      ctx.fillStyle = "#987b57";
      if ((tx + ty) % 3 === 0) ctx.fillRect(x + 6, y + 7, 6, 4);
      if ((tx * 3 + ty) % 4 === 0) ctx.fillRect(x + 16, y + 16, 4, 3);
    }

    if (terrain === "water") {
      ctx.fillStyle = "#356b82";
      ctx.fillRect(x, y, tile, tile);
      ctx.fillStyle = "#5f9cb1";
      const offset = Math.floor(time / 350) % 5;
      ctx.fillRect(x + (ty * 3 + offset) % 12, y + 7, 7, 2);
      ctx.fillRect(x + (ty * 5 + offset * 2) % 13, y + 17, 5, 2);
    }

    if (terrain === "bridge") {
      ctx.fillStyle = "#946d48";
      ctx.fillRect(x, y, tile, tile);
      ctx.fillStyle = "#684a35";
      ctx.fillRect(x, y + 3, tile, 2);
      ctx.fillRect(x, y + 14, tile, 2);
      ctx.fillRect(x + 3, y, 2, tile);
      ctx.fillRect(x + 18, y, 2, tile);
    }

    if (terrain === "tree") {
      ctx.fillStyle = "#355b45";
      ctx.fillRect(x, y, tile, tile);
      ctx.fillStyle = "#254633";
      ctx.fillRect(x + 3, y + 3, 18, 13);
      ctx.fillStyle = "#4c7450";
      ctx.fillRect(x + 6, y + 2, 12, 10);
      ctx.fillStyle = "#68452f";
      ctx.fillRect(x + 10, y + 16, 5, 8);
    }

    if (terrain === "gate") {
      ctx.fillStyle = "#537851";
      ctx.fillRect(x, y, tile, tile);
      ctx.fillStyle = "#7a6648";
      ctx.fillRect(x + 3, y, 4, tile);
      ctx.fillRect(x + 17, y, 4, tile);
      ctx.fillStyle = "#ddbc70";
      ctx.fillRect(x + 9, y + 5, 6, 2);
      ctx.fillRect(x + 11, y + 11, 2, 2);
    }
  }

  function drawLandmarks() {
    // Dock lantern: the point where the journey begins.
    ctx.fillStyle = "#6f4c35";
    ctx.fillRect(7 * tile + 8, 20 * tile - 6, 7, 23);
    ctx.fillStyle = "#f6d77a";
    ctx.fillRect(7 * tile + 5, 20 * tile - 10, 13, 9);

    // A compact lookout above the Tenerife path, leaving the meadow open.
    ctx.fillStyle = "#705341";
    ctx.fillRect(20 * tile + 8, 4 * tile + 10, 8, 31);
    ctx.fillStyle = "#d5c27e";
    ctx.fillRect(19 * tile + 9, 4 * tile + 4, 30, 8);
    ctx.fillStyle = "#324c5a";
    ctx.fillRect(20 * tile + 11, 5 * tile + 6, 15, 5);
    ctx.fillStyle = "#8db6bb";
    ctx.fillRect(20 * tile + 23, 5 * tile + 7, 7, 3);
    ctx.fillStyle = "#476c4b";
    ctx.fillRect(18 * tile + 5, 6 * tile + 9, 14, 12);
    ctx.fillRect(23 * tile + 7, 6 * tile + 7, 13, 14);
  }

  function drawShrine(memory, time) {
    const pulse = Math.floor(time / 240) % 2;
    const x = memory.x;
    const y = memory.y;
    ctx.fillStyle = "#3c4f52";
    ctx.fillRect(x - 9, y - 4, 18, 12);
    ctx.fillStyle = "#c8b780";
    ctx.fillRect(x - 4, y - 17, 8, 16);
    ctx.fillStyle = "#f8df88";
    ctx.fillRect(x - 3, y - 23 - pulse, 6, 7);
    ctx.fillStyle = "#fff4bd";
    ctx.fillRect(x - 1, y - 21 - pulse, 2, 3);
    if (seenMemories.has(memory.id)) {
      ctx.fillStyle = "#e76864";
      ctx.fillRect(x + 6, y - 16, 4, 4);
    }
  }

  function drawPlayer() {
    const x = Math.round(player.x - player.size / 2);
    const y = Math.round(player.y - player.size / 2);
    ctx.fillStyle = "#282c3b";
    ctx.fillRect(x + 3, y + 10, 9, 7);
    ctx.fillStyle = "#d95f54";
    ctx.fillRect(x + 2, y + 5, 11, 8);
    ctx.fillStyle = "#f4c4a4";
    ctx.fillRect(x + 4, y + 2, 7, 6);
    ctx.fillStyle = "#4b2d36";
    ctx.fillRect(x + 3, y, 9, 4);
    ctx.fillStyle = "#f0d986";
    if (player.direction === "left") ctx.fillRect(x + 1, y + 7, 2, 2);
    if (player.direction === "right") ctx.fillRect(x + 12, y + 7, 2, 2);
  }

  function draw(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let ty = 0; ty < rows; ty += 1) {
      for (let tx = 0; tx < columns; tx += 1) {
        drawTile(tx, ty, terrainAt(tx, ty), time);
      }
    }
    drawLandmarks();
    memories.forEach((memory) => drawShrine(memory, time));
    drawPlayer();
  }

  function nearestInteractive() {
    const threshold = 34;
    const memory = memories.find((item) => Math.hypot(player.x - item.x, player.y - item.y) < threshold);
    if (memory) return { type: "memory", value: memory };
    if (!state.gateOpen && Math.hypot(player.x - 25 * tile, player.y - 10.5 * tile) < 50) return { type: "gate" };
    return null;
  }

  function refreshPrompt() {
    if (!state.running || state.modalOpen) return;
    const interactive = nearestInteractive();
    if (interactive?.type === "memory") {
      prompt.textContent = `E · ${interactive.value.title}`;
    } else if (interactive?.type === "gate") {
      prompt.textContent = "E · Η ήσυχη πύλη";
    } else {
      prompt.textContent = "Βρες τα μικρά φώτα στον χάρτη.";
    }
  }

  function openMemory(memory) {
    seenMemories.add(memory.id);
    saveProgress();
    updateMemoryCount();
    memoryPlace.textContent = memory.place;
    memoryTitle.textContent = memory.title;
    memoryBody.textContent = memory.body;
    memoryNote.textContent = memory.note;
    memoryImage.className = `memory-image ${memory.id}`;
    memoryImage.style.backgroundImage = memory.image ? `url("${memory.image}")` : "none";
    state.modalOpen = true;
    memoryModal.classList.add("is-visible");
    memoryModal.setAttribute("aria-hidden", "false");
  }

  function closeMemory() {
    memoryModal.classList.remove("is-visible");
    memoryModal.setAttribute("aria-hidden", "true");
    state.modalOpen = false;
    refreshPrompt();
  }

  function openPuzzle() {
    state.modalOpen = true;
    state.runeInput = [];
    puzzleStatus.textContent = "";
    puzzleModal.classList.add("is-visible");
    puzzleModal.setAttribute("aria-hidden", "false");
  }

  function closePuzzle() {
    puzzleModal.classList.remove("is-visible");
    puzzleModal.setAttribute("aria-hidden", "true");
    state.modalOpen = false;
    refreshPrompt();
  }

  function playRune(rune) {
    const code = ["moon", "flower", "star"];
    state.runeInput.push(rune);
    const currentIndex = state.runeInput.length - 1;
    if (state.runeInput[currentIndex] !== code[currentIndex]) {
      state.runeInput = [];
      puzzleStatus.textContent = "Ο ήχος έσβησε. Δοκίμασε ξανά.";
      return;
    }
    if (state.runeInput.length === code.length) {
      state.gateOpen = true;
      saveProgress();
      puzzleStatus.textContent = "Η πύλη θυμήθηκε τον δρόμο.";
      window.setTimeout(closePuzzle, 900);
      return;
    }
    puzzleStatus.textContent = "Κάτι ακούστηκε πίσω από την πύλη...";
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
    dx = (dx / length) * player.speed * delta;
    dy = (dy / length) * player.speed * delta;
    if (!isBlocked(player.x + dx, player.y)) player.x += dx;
    if (!isBlocked(player.x, player.y + dy)) player.y += dy;
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
    canvas.focus();
  });
  document.querySelector("#close-memory").addEventListener("click", closeMemory);
  document.querySelector("#close-puzzle").addEventListener("click", closePuzzle);
  document.querySelectorAll(".rune-button").forEach((button) => button.addEventListener("click", () => playRune(button.dataset.rune)));

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", "e", "enter", "escape"].includes(key)) event.preventDefault();
    if (key === "escape") {
      if (memoryModal.classList.contains("is-visible")) closeMemory();
      if (puzzleModal.classList.contains("is-visible")) closePuzzle();
      return;
    }
    if ((key === "e" || key === "enter") && state.running && !state.modalOpen) {
      const interactive = nearestInteractive();
      if (interactive?.type === "memory") openMemory(interactive.value);
      if (interactive?.type === "gate") openPuzzle();
      return;
    }
    if (!state.modalOpen) keys.add(key);
  });
  window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
  window.addEventListener("blur", () => keys.clear());

  requestAnimationFrame(gameLoop);
})();
