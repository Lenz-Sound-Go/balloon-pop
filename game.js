const gameArea = document.querySelector("#gameArea");
const scoreEl = document.querySelector("#score");
const levelEl = document.querySelector("#level");
const startPanel = document.querySelector("#startPanel");
const startButton = document.querySelector("#startButton");

const balloonColors = ["#ff5aa5", "#ffd85a", "#4dabff", "#65dc82", "#a56eff", "#ff8b45"];

let score = 0;
let spawnDelay = 900;
let minSpawnDelay = 310;
let gameRunning = false;
let lastSpawnAt = 0;
let animationFrame = 0;

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function updateHud() {
  scoreEl.textContent = String(score);
  const speed = Math.min(4.5, 1 + score * 0.055);
  levelEl.textContent = `${speed.toFixed(1)}x`;
}

function getDifficulty() {
  return Math.min(1, score / 75);
}

function scheduleNextSpawn() {
  const difficulty = getDifficulty();
  spawnDelay = Math.max(minSpawnDelay, 900 - difficulty * 560 - score * 2.2);
}

function createBalloon() {
  const balloon = document.createElement("button");
  const size = randomBetween(48, 82);
  const duration = Math.max(2500, randomBetween(6200, 7600) - score * 55);
  const left = randomBetween(10, 90);
  const drift = randomBetween(-90, 90);
  const tilt = randomBetween(-9, 9);
  const color = balloonColors[Math.floor(Math.random() * balloonColors.length)];

  balloon.type = "button";
  balloon.className = "balloon";
  balloon.setAttribute("aria-label", "Pop balloon");
  balloon.style.setProperty("--balloon-size", `${size}px`);
  balloon.style.setProperty("--balloon-left", `${left}%`);
  balloon.style.setProperty("--balloon-color", color);
  balloon.style.setProperty("--drift", `${drift}px`);
  balloon.style.setProperty("--tilt", `${tilt}deg`);
  balloon.style.animationDuration = `${duration}ms`;

  balloon.addEventListener("pointerdown", popBalloon, { once: true });
  balloon.addEventListener("animationend", () => balloon.remove());

  gameArea.append(balloon);
}

function showPopScore(x, y) {
  const popScore = document.createElement("div");
  const bounds = gameArea.getBoundingClientRect();

  popScore.className = "pop-score";
  popScore.textContent = "+1";
  popScore.style.left = `${x - bounds.left}px`;
  popScore.style.top = `${y - bounds.top}px`;
  popScore.addEventListener("animationend", () => popScore.remove());

  gameArea.append(popScore);
}

function popBalloon(event) {
  const balloon = event.currentTarget;

  if (!gameRunning || balloon.classList.contains("popped")) {
    return;
  }

  event.preventDefault();
  score += 1;
  updateHud();
  scheduleNextSpawn();
  showPopScore(event.clientX, event.clientY);

  balloon.classList.add("popped");
  setTimeout(() => balloon.remove(), 220);
}

function gameLoop(timestamp) {
  if (!gameRunning) {
    return;
  }

  if (!lastSpawnAt) {
    lastSpawnAt = timestamp;
  }

  if (timestamp - lastSpawnAt >= spawnDelay) {
    createBalloon();
    lastSpawnAt = timestamp;
    scheduleNextSpawn();
  }

  animationFrame = requestAnimationFrame(gameLoop);
}

function clearBalloons() {
  gameArea.querySelectorAll(".balloon, .pop-score").forEach((element) => element.remove());
}

function startGame() {
  score = 0;
  spawnDelay = 900;
  gameRunning = true;
  lastSpawnAt = 0;
  cancelAnimationFrame(animationFrame);
  clearBalloons();
  updateHud();
  startPanel.classList.add("hidden");

  createBalloon();
  animationFrame = requestAnimationFrame(gameLoop);
}

startButton.addEventListener("click", startGame);
updateHud();
