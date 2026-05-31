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

// ポップごとに進む「カエルの歌」メロディ
const KAERU_NO_UTA = [
  261.63, 293.66, 329.63, 349.23, 329.63, 293.66, 261.63,
  329.63, 349.23, 392.00, 440.00, 392.00, 349.23, 329.63,
  261.63, 261.63, 261.63, 329.63, 329.63, 329.63,
  392.00, 349.23, 329.63, 293.66, 261.63
];

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

// === ポップ効果音（カエルの歌のメロディ） ===
let kaeruIndex = 0;

function playPopSound() {
  initAudio();

  // カエルの歌の次の音
  const freq = KAERU_NO_UTA[kaeruIndex];
  kaeruIndex = (kaeruIndex + 1) % KAERU_NO_UTA.length;

  const now = audioCtx.currentTime;

  // 主音（ポップ感を出すため短いアタック）
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "triangle";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.35);

  // 倍音で音を豊かに
  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  osc2.type = "sine";
  osc2.frequency.value = freq * 2;
  gain2.gain.setValueAtTime(0.08, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  osc2.connect(gain2);
  gain2.connect(audioCtx.destination);
  osc2.start(now);
  osc2.stop(now + 0.25);
}

// === BGM: 一般的なメロディBGM ===
// 作曲: 短い可愛いループメロディ
const BGM_NOTES = [
  // 小節1
  { note: "C4", dur: 0.3 },
  { note: "E4", dur: 0.3 },
  { note: "G4", dur: 0.3 },
  { note: "C5", dur: 0.3 },
  { note: "B4", dur: 0.3 },
  { note: "G4", dur: 0.3 },
  { note: "E4", dur: 0.3 },
  { note: "D4", dur: 0.3 },
  // 小節2
  { note: "C4", dur: 0.3 },
  { note: "E4", dur: 0.3 },
  { note: "G4", dur: 0.3 },
  { note: "A4", dur: 0.3 },
  { note: "G4", dur: 0.3 },
  { note: "E4", dur: 0.3 },
  { note: "F4", dur: 0.3 },
  { note: "D4", dur: 0.3 },
  // 小節3
  { note: "E4", dur: 0.3 },
  { note: "G4", dur: 0.3 },
  { note: "B4", dur: 0.3 },
  { note: "G4", dur: 0.3 },
  { note: "A4", dur: 0.3 },
  { note: "F4", dur: 0.3 },
  { note: "D4", dur: 0.3 },
  { note: "C4", dur: 0.3 },
  // 小節4
  { note: "C4", dur: 0.3 },
  { note: "G3", dur: 0.15 },
  { note: "A3", dur: 0.15 },
  { note: "B3", dur: 0.15 },
  { note: "C4", dur: 0.15 },
  { note: "D4", dur: 0.15 },
  { note: "E4", dur: 0.15 },
  { note: "F4", dur: 0.15 },
];

const NOTE_TO_FREQ = {
  C3: 130.81, "C#3": 138.59, D3: 146.83, "D#3": 155.56, E3: 164.81, F3: 174.61, "F#3": 185.00, G3: 196.00, "G#3": 207.65, A3: 220.00, "A#3": 233.08, B3: 246.94,
  C4: 261.63, "C#4": 277.18, D4: 293.66, "D#4": 311.13, E4: 329.63, F4: 349.23, "F#4": 369.99, G4: 392.00, "G#4": 415.30, A4: 440.00, "A#4": 466.16, B4: 493.88,
  C5: 523.25, "C#5": 554.37, D5: 587.33, "D#5": 622.25, E5: 659.25, F5: 698.46, "F#5": 739.99, G5: 783.99, "G#5": 830.61, A5: 880.00, "A#5": 932.33, B5: 987.77,
};

// ベース進行（コードルート）
const BASS_PATTERN = ["C3", "G3", "A3", "F3"];

function startBGM() {
  initAudio();
  stopBGM();

  let step = 0;

  bgmIntervalId = setInterval(() => {
    if (!gameRunning) return;

    const beatTime = 0.3;
    const now = audioCtx.currentTime;

    // --- ベース音（2拍ごとに切り替え） ---
    const bassIdx = Math.floor(step / 2) % BASS_PATTERN.length;
    const bassFreq = NOTE_TO_FREQ[BASS_PATTERN[bassIdx]];
    const bassOsc = audioCtx.createOscillator();
    const bassGain = audioCtx.createGain();
    bassOsc.type = "triangle";
    bassOsc.frequency.value = bassFreq;
    bassGain.gain.setValueAtTime(0.09, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + beatTime * 1.5);
    bassOsc.connect(bassGain);
    bassGain.connect(audioCtx.destination);
    bassOsc.start(now);
    bassOsc.stop(now + beatTime * 1.5);

    // --- メロディ ---
    const melodyIdx = step % BGM_NOTES.length;
    const mel = BGM_NOTES[melodyIdx];
    const melFreq = NOTE_TO_FREQ[mel.note];

    const melOsc = audioCtx.createOscillator();
    const melGain = audioCtx.createGain();
    melOsc.type = "square";
    melOsc.frequency.value = melFreq;
    melGain.gain.setValueAtTime(0.05, now);
    melGain.gain.exponentialRampToValueAtTime(0.001, now + mel.dur * 0.85);
    melOsc.connect(melGain);
    melGain.connect(audioCtx.destination);
    melOsc.start(now);
    melOsc.stop(now + mel.dur);

    // --- 和音（メロディと同時に柔らかいパッド） ---
    if (step % 4 === 0) {
      const chordRoot = NOTE_TO_FREQ[BASS_PATTERN[bassIdx]];
      [0, 4, 7].forEach((semi, i) => {
        const padOsc = audioCtx.createOscillator();
        const padGain = audioCtx.createGain();
        padOsc.type = "sine";
        padOsc.frequency.value = chordRoot * Math.pow(2, semi / 12);
        padGain.gain.setValueAtTime(0.03, now);
        padGain.gain.exponentialRampToValueAtTime(0.001, now + beatTime * 3);
        padOsc.connect(padGain);
        padGain.connect(audioCtx.destination);
        padOsc.start(now);
        padOsc.stop(now + beatTime * 3);
      });
    }

    step++;
  }, 300); // 300ms = 1拍
}

function stopBGM() {
  if (bgmIntervalId) {
    clearInterval(bgmIntervalId);
    bgmIntervalId = null;
  }
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
  spawnDelay = Math.max(450, 1000 - (stageNum - 1) * 70);
  kaeruIndex = 0;

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
let minSpawnDelay = 400;

// 顔タイプごとのスコアと速度
const FACE_CONFIG = {
  takeshi: { score: 2, label: "兄", speedBonus: 0.75 },  // 兄: 速い・高得点
  kenji:    { score: 1, label: "弟", speedBonus: 1.25 },  // 弟: 遅い・低得点
};
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
  spawnDelay = Math.max(minSpawnDelay, 950 - difficulty * 400 - score * 1.5);
}

function createBalloon() {
  const balloon = document.createElement("button");
  
  // Randomly pick one of two faces (50/50)
  const faceType = Math.random() < 0.5 ? "takeshi" : "kenji";
  const config = FACE_CONFIG[faceType];
  
  const size = randomBetween(52, 90);
  const baseDuration = faceType === "takeshi" ? randomBetween(3500, 5000) : randomBetween(5500, 7500);
  const duration = Math.max(2000, baseDuration - score * 30);
  const left = randomBetween(10, 90);
  const drift = randomBetween(-90, 90);
  const tilt = randomBetween(-9, 9);

  balloon.type = "button";
  balloon.className = `face-balloon face-${faceType}`;
  balloon.setAttribute("data-face", faceType);
  balloon.setAttribute("aria-label", `${config.label}の風船`);
  balloon.style.setProperty("--face-size", `${size}px`);
  balloon.style.setProperty("--face-left", `${left}%`);
  balloon.style.setProperty("--drift", `${drift}px`);
  balloon.style.setProperty("--tilt", `${tilt}deg`);
  balloon.style.animationDuration = `${duration}ms`;

  balloon.addEventListener("pointerdown", popBalloon, { once: true });
  balloon.addEventListener("animationend", () => balloon.remove());

  gameArea.append(balloon);
}

function showPopScore(x, y, faceType) {
  const popScore = document.createElement("div");
  const bounds = gameArea.getBoundingClientRect();
  const config = FACE_CONFIG[faceType] || FACE_CONFIG.kenji;

  popScore.className = "pop-score";
  popScore.textContent = `+${config.score}`;
  popScore.style.left = `${x - bounds.left}px`;
  popScore.style.top = `${y - bounds.top}px`;
  if (faceType === "takeshi") {
    popScore.style.color = "#FFD700";  // 兄は金色
  }
  popScore.addEventListener("animationend", () => popScore.remove());

  // ラベルも表示
  const label = document.createElement("div");
  label.className = "pop-label";
  label.textContent = config.label;
  label.style.left = `${x - bounds.left}px`;
  label.style.top = `${y - bounds.top - 18}px`;
  label.style.color = faceType === "takeshi" ? "#FFD700" : "#90EE90";
  label.addEventListener("animationend", () => label.remove());

  gameArea.append(popScore);
  gameArea.append(label);
}

function popBalloon(event) {
  const balloon = event.currentTarget;

  if (!gameRunning || balloon.classList.contains("popped")) {
    return;
  }

  event.preventDefault();
  const faceType = balloon.getAttribute("data-face") || "kenji";
  const config = FACE_CONFIG[faceType];
  score += config.score;
  popsInStage += 1;
  updateHud();
  scheduleNextSpawn();
  showPopScore(event.clientX, event.clientY, faceType);

  // カエルの歌メロディ効果音
  playPopSound();

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
  kaeruIndex = 0;

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
