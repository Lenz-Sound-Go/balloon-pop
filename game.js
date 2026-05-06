const gameArea = document.querySelector("#gameArea");
const scoreEl = document.querySelector("#score");
const levelEl = document.querySelector("#level");
const startPanel = document.querySelector("#startPanel");
const startButton = document.querySelector("#startButton");
const stageEl = document.querySelector("#stage");

// === 効果音・BGM用 AudioContext ===
let audioCtx = null;

// BGM: ステージごとに異なる進行（各音は約0.5秒ずつ）
let bgmIntervalId = null;
let bgmNoteIndex = 0;
let bgmOsc = null;
let bgmGain = null;

// ポップごとに進むメロディノート
let melodyNoteIndex = 0;

// スケール定義（各ステージで異なるキー）
const STAGE_SCALES = {
  1: [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25], // C major
  2: [293.66, 329.63, 369.99, 392.00, 440.00, 493.88, 554.37, 587.33, 659.25, 739.99], // D major
  3: [329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99], // E major
  4: [196.00, 220.00, 261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25], // F major (lower)
  5: [392.00, 440.00, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77], // G major
};

function getStageScale(stageNum) {
  return STAGE_SCALES[stageNum] || STAGE_SCALES[1];
}

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

// === ポップ効果音（シンプルな破裂音） ===
function playPopSound() {
  initAudio();

  // 短いノイズバースト＋ピッチ下降
  const bufSize = audioCtx.sampleRate * 0.1;
  const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) {
    const t = i / audioCtx.sampleRate;
    data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 55) * (1 - t * 8);
  }
  const src = audioCtx.createBufferSource();
  src.buffer = buf;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);

  const filter = audioCtx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2200, audioCtx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.07);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  src.start();
  src.stop(audioCtx.currentTime + 0.1);
}

// === BGM: １曲流し続ける ===
function startBGM() {
  initAudio();
  stopBGM();

  const scale = getStageScale(stage);
  bgmNoteIndex = 0;

  // 低音の持続音（ドローン）
  const droneOsc = audioCtx.createOscillator();
  const droneGain = audioCtx.createGain();
  droneOsc.type = "sawtooth";
  droneOsc.frequency.value = scale[0] / 2; // 1オクターブ下
  droneGain.gain.setValueAtTime(0.04, audioCtx.currentTime);
  droneOsc.connect(droneGain);
  droneGain.connect(audioCtx.destination);
  droneOsc.start();

  // リズム進行（BGMループ）
  bgmIntervalId = setInterval(() => {
    if (!gameRunning) return;

    const freq = scale[bgmNoteIndex % scale.length];
    bgmNoteIndex++;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  }, 400);

  // ドローンを保存して後で停止できるように
  bgmOsc = droneOsc;
  bgmGain = droneGain;
}

function stopBGM() {
  if (bgmIntervalId) {
    clearInterval(bgmIntervalId);
    bgmIntervalId = null;
  }
  if (bgmOsc) {
    try { bgmOsc.stop(); } catch(e) {}
    bgmOsc = null;
  }
  if (bgmGain) {
    try { bgmGain.disconnect(); } catch(e) {}
    bgmGain = null;
  }
}

// === 風船を潰すたびに進むメロディ ===
function playMelodyNote() {
  initAudio();

  const scale = getStageScale(stage);
  melodyNoteIndex = (melodyNoteIndex + 1) % scale.length;
  const freq = scale[melodyNoteIndex];

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.14, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);

  // 倍音で音を豊かに
  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  osc2.type = "triangle";
  osc2.frequency.value = freq * 2;
  gain2.gain.setValueAtTime(0.05, audioCtx.currentTime);
  gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);

  osc.connect(gain);
  osc2.connect(gain2);
  gain.connect(audioCtx.destination);
  gain2.connect(audioCtx.destination);
  osc.start();
  osc2.start();
  osc.stop(audioCtx.currentTime + 0.8);
  osc2.stop(audioCtx.currentTime + 0.6);
}

// === ステージクリア音 ===
function playClearSound() {
  initAudio();

  const notes = [523.25, 659.25, 783.99, 1046.50];
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const t = audioCtx.currentTime + i * 0.12;
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  });
}

// === ステージ管理 ===
const POPS_PER_STAGE = 10;
let stage = 1;
let popsInStage = 0;

function updateStageHud() {
  stageEl.textContent = `${stage}`;
}

function transitionToNextStage() {
  // BGMを停止（ステージクリア）
  stopBGM();

  gameRunning = false;
  cancelAnimationFrame(animationFrame);

  playClearSound();

  // ステージ移行パネル
  const transitionPanel = document.createElement("div");
  transitionPanel.className = "panel stage-transition";
  transitionPanel.innerHTML = `
    <h1>🎉 Stage ${stage}</h1>
    <p>次のステージへ進むよ！</p>
    <button type="button" id="nextStageBtn">スタート！</button>
  `;
  gameArea.append(transitionPanel);

  document.querySelector("#nextStageBtn").addEventListener("click", () => {
    clearBalloons();
    transitionPanel.remove();
    startStage(stage);
  });
}

function startStage(stageNum) {
  stage = stageNum;
  popsInStage = 0;
  spawnDelay = Math.max(380, 900 - (stageNum - 1) * 100);
  melodyNoteIndex = 0;

  // ステージに応じて背景色を変更
  const stageHues = [190, 140, 280, 350, 30];
  const hue = stageHues[(stageNum - 1) % stageHues.length];
  document.body.style.setProperty("--sky-top", `hsl(${hue}, 70%, 75%)`);
  document.body.style.setProperty("--sky-bottom", `hsl(${hue}, 40%, 93%)`);

  gameRunning = true;
  lastSpawnAt = 0;
  cancelAnimationFrame(animationFrame);
  updateHud();
  updateStageHud();

  // BGM開始
  startBGM();

  // 最初の風船
  createBalloon();
  animationFrame = requestAnimationFrame(gameLoop);
}

// === ゲームロジック ===
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
  const size = randomBetween(52, 90); // 少し大きく（顔が見えるように）
  const duration = Math.max(2500, randomBetween(6200, 7600) - score * 55);
  const left = randomBetween(10, 90);
  const drift = randomBetween(-90, 90);
  const tilt = randomBetween(-9, 9);

  balloon.type = "button";
  balloon.className = "face-balloon";
  balloon.setAttribute("aria-label", "Pop balloon");
  balloon.style.setProperty("--face-size", `${size}px`);
  balloon.style.setProperty("--face-left", `${left}%`);
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
  popsInStage += 1;
  updateHud();
  scheduleNextSpawn();
  showPopScore(event.clientX, event.clientY);

  // 効果音＋メロディ進行
  playPopSound();
  playMelodyNote();

  balloon.classList.add("popped");
  setTimeout(() => balloon.remove(), 220);

  // 10個でステージ進行
  if (popsInStage >= POPS_PER_STAGE) {
    setTimeout(() => {
      stage += 1;
      transitionToNextStage();
    }, 300);
  }
}

function gameLoop(timestamp) {
  if (!gameRunning) return;

  if (!lastSpawnAt) lastSpawnAt = timestamp;

  if (timestamp - lastSpawnAt >= spawnDelay) {
    createBalloon();
    lastSpawnAt = timestamp;
    scheduleNextSpawn();
  }

  animationFrame = requestAnimationFrame(gameLoop);
}

function clearBalloons() {
  gameArea.querySelectorAll(".face-balloon, .pop-score, .stage-transition").forEach((el) => el.remove());
}

function startGame() {
  score = 0;
  stage = 1;
  popsInStage = 0;
  spawnDelay = 900;
  melodyNoteIndex = 0;

  // 背景リセット
  document.body.style.setProperty("--sky-top", "#86e0ff");
  document.body.style.setProperty("--sky-bottom", "#f8fbff");

  stopBGM();
  gameRunning = true;
  lastSpawnAt = 0;
  cancelAnimationFrame(animationFrame);
  clearBalloons();
  updateHud();
  updateStageHud();
  startPanel.classList.add("hidden");

  startBGM();
  createBalloon();
  animationFrame = requestAnimationFrame(gameLoop);
}

startButton.addEventListener("click", startGame);
updateHud();
updateStageHud();
