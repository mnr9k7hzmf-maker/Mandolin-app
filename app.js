const strings = ["G3", "D4", "A4", "E5"];

let mode = "practice";
let targetNote = null;
let listening = false;
let score = 0;
let timeLeft = 60;
let gameTimer = null;

const targetDiv = document.getElementById("targetNote");
const gameInfoDiv = document.getElementById("gameInfo");
const status = document.getElementById("status");
const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");

document.querySelectorAll(".modes button").forEach(btn => {
  btn.onclick = () => mode = btn.dataset.mode;
});

startBtn.onclick = start;
stopBtn.onclick = stop;

let audioContext, analyser, data, stream, raf;

async function start() {
  startBtn.disabled = true;
  stopBtn.disabled = false;
  listening = true;

  audioContext = new AudioContext();
  stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const src = audioContext.createMediaStreamSource(stream);

  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  data = new Float32Array(analyser.fftSize);
  src.connect(analyser);

  if (mode === "practice" || mode === "game") {
    pickTarget();
  }

  if (mode === "game") {
    startGameTimer();
  } else {
    gameInfoDiv.textContent = "";
  }

  listen();
}

function stop() {
  listening = false;
  cancelAnimationFrame(raf);

  if (gameTimer) clearInterval(gameTimer);

  stream.getTracks().forEach(t => t.stop());
  audioContext.close();

  startBtn.disabled = false;
  stopBtn.disabled = true;

  targetDiv.textContent = "";
  gameInfoDiv.textContent = "";
  status.textContent = "Stopped";
  status.className = "";
}

function pickTarget() {
  targetNote = strings[Math.floor(Math.random() * strings.length)];
  targetDiv.textContent = "Play: " + targetNote;
}

function listen() {
  if (!listening) return;

  analyser.getFloatTimeDomainData(data);
  const freq = autoCorrelate(data, audioContext.sampleRate);

  if (freq !== -1) {
    const note = frequencyToNote(freq);

    if (mode === "tuner") {
      targetDiv.textContent = "Heard: " + note;
    }

    if ((mode === "practice" || mode === "game") && note === targetNote) {
      status.textContent = "Correct ✔";
      status.className = "correct";

      if (mode === "game") score++;

      pickTarget();
    } else if (mode !== "tuner") {
      status.textContent = "Try Again";
      status.className = "incorrect";
    }
  }

  raf = requestAnimationFrame(listen);
}

function startGameTimer() {
  score = 0;
  timeLeft = 60;

  gameInfoDiv.textContent = `Time: ${timeLeft}s | Score: ${score}`;

  gameTimer = setInterval(() => {
    timeLeft--;
    gameInfoDiv.textContent = `Time: ${timeLeft}s | Score: ${score}`;

    if (timeLeft <= 0) {
      clearInterval(gameTimer);
      stop();
      targetDiv.textContent = "Game Over";
      gameInfoDiv.textContent = `Final Score: ${score}`;
    }
  }, 1000);
}
