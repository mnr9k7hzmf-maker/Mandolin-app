/*************************
 * MANDOLIN TRAINER APP
 * Clean full rewrite
 *************************/

/* ========= DATA ========= */

const mandolinMap = {
  G: ["G3","G#3","A3","A#3","B3","C4","C#4"],
  D: ["D4","D#4","E4","F4","F#4","G4","G#4"],
  A: ["A4","A#4","B4","C5","C#5","D5","D#5"],
  E: ["E5","F5","F#5","G5","G#5","A5","A#5"]
};

const scales = {
  chromatic: null,
  g: ["G","A","B","C","D","E","F#"],
  d: ["D","E","F#","G","A","B","C#"],
  a: ["A","B","C#","D","E","F#","G#"]
};

const presets = {
  beginner: { maxFret: 2, scale: "g", string: "all" },
  intermediate: { maxFret: 4, scale: "d", string: "all" },
  advanced: { maxFret: 6, scale: "chromatic", string: "all" }
};

/* ========= STATE ========= */

let settings = JSON.parse(localStorage.getItem("mandolinSettings")) || {
  difficulty: "beginner",
  scale: "chromatic",
  string: "all",
  maxFret: 6
};

let mode = "practice";
let notes = [];
let target = null;

let listening = false;
let audioCtx, analyser, buffer, stream, raf;

let score = 0;
let timeLeft = 60;
let gameTimer = null;

/* ========= DOM ========= */

const fretboard = document.getElementById("fretboard");
const targetDiv = document.getElementById("targetNote");
const instructionDiv = document.getElementById("instruction");
const statusDiv = document.getElementById("status");

const fretRange = document.getElementById("fretRange");
const fretValue = document.getElementById("fretValue");
const scaleSelect = document.getElementById("scaleSelect");
const stringSelect = document.getElementById("stringSelect");
const difficultySelect = document.getElementById("difficulty");

const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");

/* ========= INIT ========= */

syncUI();
rebuild();

/* ========= UI EVENTS ========= */

fretRange.oninput = e => update({ maxFret: +e.target.value });
scaleSelect.onchange = e => update({ scale: e.target.value });
stringSelect.onchange = e => update({ string: e.target.value });
difficultySelect.onchange = e => applyPreset(e.target.value);

document.querySelectorAll(".modes button").forEach(btn => {
  btn.onclick = () => mode = btn.dataset.mode;
});

startBtn.onclick = startListening;
stopBtn.onclick = stopListening;

/* ========= SETTINGS ========= */

function applyPreset(level) {
  update({ difficulty: level, ...presets[level] });
}

function update(changes) {
  settings = { ...settings, ...changes };
  localStorage.setItem("mandolinSettings", JSON.stringify(settings));
  syncUI();
  rebuild();
}

function syncUI() {
  fretRange.value = settings.maxFret;
  fretValue.textContent = settings.maxFret;
  scaleSelect.value = settings.scale;
  stringSelect.value = settings.string;
  difficultySelect.value = settings.difficulty;
}

/* ========= BUILD NOTES ========= */

function rebuild() {
  buildNotes();
  buildFretboard();
  pickTarget();
}

function buildNotes() {
  notes = [];

  Object.entries(mandolinMap).forEach(([string, frets]) => {
    if (settings.string !== "all" && settings.string !== string) return;

    frets.forEach((note, fret) => {
      if (fret === 0) return;            // no open strings
      if (fret > settings.maxFret) return;

      if (settings.scale !== "chromatic") {
        const pitch = note.replace(/[0-9]/g, "");
        if (!scales[settings.scale].includes(pitch)) return;
      }

      notes.push({ string, fret, note });
    });
  });
}

/* ========= FRETBOARD ========= */

function buildFretboard() {
  fretboard.innerHTML = "";

  Object.entries(mandolinMap).forEach(([string, frets]) => {
    const row = document.createElement("div");
    row.className = "string-row";

    const label = document.createElement("div");
    label.className = "string-label";
    label.textContent = string;
    row.appendChild(label);

    frets.forEach((note, fret) => {
      if (fret === 0) return;
      if (fret > settings.maxFret) return;

      const cell = document.createElement("div");
      cell.className = "fret";
      cell.dataset.string = string;
      cell.dataset.fret = fret;

      const dot = document.createElement("div");
      dot.className = "dot";

      if (settings.scale !== "chromatic") {
        const pitch = note.replace(/[0-9]/g, "");
        if (scales[settings.scale].includes(pitch)) {
          dot.classList.add("scale");
        }
      }

      cell.appendChild(dot);
      row.appendChild(cell);
    });

    fretboard.appendChild(row);
  });
}

/* ========= TARGET ========= */

function pickTarget() {
  if (!notes.length) return;

  target = notes[Math.floor(Math.random() * notes.length)];
  targetDiv.textContent = `Play: ${target.note}`;
  instructionDiv.textContent =
    `String: ${target.string} | Fret: ${target.fret}`;

  highlightTarget();
}

function highlightTarget() {
  document.querySelectorAll(".dot").forEach(d =>
    d.classList.remove("active")
  );

  document.querySelectorAll(".fret").forEach(cell => {
    if (
      cell.dataset.string === target.string &&
      Number(cell.dataset.fret) === target.fret
    ) {
      cell.querySelector(".dot").classList.add("active");
    }
  });
}

/* ========= AUDIO ========= */

async function startListening() {
  if (listening) return;
  listening = true;

  startBtn.disabled = true;
  stopBtn.disabled = false;

  audioCtx = new AudioContext();
  stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  const source = audioCtx.createMediaStreamSource(stream);
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  buffer = new Float32Array(analyser.fftSize);

  source.connect(analyser);

  if (mode === "game") startGame();
  listenLoop();
}

function stopListening() {
  listening = false;

  cancelAnimationFrame(raf);
  if (gameTimer) clearInterval(gameTimer);

  if (stream) stream.getTracks().forEach(t => t.stop());
  if (audioCtx) audioCtx.close();

  startBtn.disabled = false;
  stopBtn.disabled = true;

  statusDiv.textContent = "Stopped";
  statusDiv.className = "";
}

function listenLoop() {
  if (!listening) return;

  analyser.getFloatTimeDomainData(buffer);
  const freq = autoCorrelate(buffer, audioCtx.sampleRate);

  if (freq !== -1) {
    const detected = frequencyToNote(freq);

    if (mode === "tuner") {
      targetDiv.textContent = `Heard: ${detected}`;
    } else if (detected === target.note) {
      statusDiv.textContent = "Correct ✔";
      statusDiv.className = "correct";
      if (mode === "game") score++;
      pickTarget();
    } else {
      statusDiv.textContent = "Try Again";
      statusDiv.className = "incorrect";
    }
  }

  raf = requestAnimationFrame(listenLoop);
}

/* ========= GAME ========= */

function startGame() {
  score = 0;
  timeLeft = 60;

  gameTimer = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
      clearInterval(gameTimer);
      stopListening();
      targetDiv.textContent = "Game Over";
      instructionDiv.textContent = `Score: ${score}`;
    }
  }, 1000);
}
