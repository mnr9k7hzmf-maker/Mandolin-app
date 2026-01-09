/* ======================
   DATA
====================== */

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

/* ======================
   STATE
====================== */

let settings = JSON.parse(localStorage.getItem("mandolinSettings")) || {
  difficulty: "beginner",
  maxFret: 2,
  scale: "g",
  string: "all"
};

let mode = "practice";
let notes = [];
let target = null;

let listening = false;
let score = 0;
let timeLeft = 60;
let timer = null;

/* ======================
   DOM
====================== */

const fretboard = document.getElementById("fretboard");
const targetDiv = document.getElementById("targetNote");
const instructionDiv = document.getElementById("instruction");
const status = document.getElementById("status");

const fretRange = document.getElementById("fretRange");
const fretValue = document.getElementById("fretValue");
const scaleSelect = document.getElementById("scaleSelect");
const stringSelect = document.getElementById("stringSelect");
const difficultySelect = document.getElementById("difficulty");

const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");

/* ======================
   SETTINGS UI
====================== */

fretRange.oninput = e => update({ maxFret: +e.target.value });
scaleSelect.onchange = e => update({ scale: e.target.value });
stringSelect.onchange = e => update({ string: e.target.value });
difficultySelect.onchange = e => applyPreset(e.target.value);

document.querySelectorAll(".modes button").forEach(btn => {
  btn.onclick = () => mode = btn.dataset.mode;
});

startBtn.onclick = start;
stopBtn.onclick = stop;

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

syncUI();
rebuild();

/* ======================
   BUILD NOTES + BOARD
====================== */

function rebuild() {
  buildNotes();
  buildFretboard();
  pickTarget();
}

function buildNotes() {
  notes = [];
  Object.entries(mandolinMap).forEach(([string, frets]) => {
    if (settings.string !== "all" && settings.string !== string) return;

    frets.slice(0, settings.maxFret + 1).forEach((note, fret) => {
      if (settings.scale !== "chromatic") {
        const pitch = note.replace(/[0-9]/g,"");
        if (!scales[settings.scale].includes(pitch)) return;
      }
      notes.push({ string, fret, note });
    });
  });
}

function buildFretboard() {
  fretboard.innerHTML = "";
  Object.entries(mandolinMap).forEach(([string, frets]) => {
    fretboard.appendChild(label(string));
    frets.slice(0, settings.maxFret + 1).forEach(note => {
      const cell = document.createElement("div");
      cell.className = "fret";

      const dot = document.createElement("div");
      dot.className = "dot";

      if (settings.scale !== "chromatic") {
        const pitch = note.replace(/[0-9]/g,"");
        if (scales[settings.scale].includes(pitch)) {
          dot.classList.add("scale");
        }
      }

      cell.appendChild(dot);
      fretboard.appendChild(cell);
    });
  });
}

function label(text) {
  const d = document.createElement("div");
  d.className = "string-label";
  d.textContent = text;
  return d;
}

/* ======================
   TARGET
====================== */

function pickTarget() {
  if (!notes.length) return;
  target = notes[Math.floor(Math.random() * notes.length)];
  targetDiv.textContent = "Play: " + target.note;
  instructionDiv.textContent = `String: ${target.string} | Fret: ${target.fret}`;
  highlightTarget();
}

function highlightTarget() {
  document.querySelectorAll(".dot").forEach(d => d.classList.remove("active"));

  let index = 0;
  Object.entries(mandolinMap).forEach(([string, frets]) => {
    frets.slice(0, settings.maxFret + 1).forEach((_, fret) => {
      if (
        string === target.string &&
        fret === target.fret
      ) {
        fretboard.querySelectorAll(".dot")[index].classList.add("active");
      }
      index++;
    });
  });
}

/* ======================
   AUDIO ENGINE
====================== */

let audioCtx, analyser, buffer, stream, raf;

async function start() {
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

  listen();
}

function stop() {
  listening = false;
  cancelAnimationFrame(raf);
  if (timer) clearInterval(timer);

  if (stream) stream.getTracks().forEach(t => t.stop());
  if (audioCtx) audioCtx.close();

  startBtn.disabled = false;
  stopBtn.disabled = true;
  status.textContent = "Stopped";
}

function listen() {
  if (!listening) return;

  analyser.getFloatTimeDomainData(buffer);
  const freq = autoCorrelate(buffer, audioCtx.sampleRate);

  if (freq !== -1) {
    const note = frequencyToNote(freq);

    if (mode === "tuner") {
      targetDiv.textContent = "Heard: " + note;
    } else if (note === target.note) {
      status.textContent = "Correct ✔";
      status.className = "correct";
      if (mode === "game") score++;
      pickTarget();
    } else {
      status.textContent = "Try Again";
      status.className = "incorrect";
    }
  }

  raf = requestAnimationFrame(listen);
}

/* ======================
   GAME MODE
====================== */

function startGame() {
  score = 0;
  timeLeft = 60;

  timer = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
      clearInterval(timer);
      stop();
      targetDiv.textContent = "Game Over";
      instructionDiv.textContent = `Score: ${score}`;
    }
  }, 1000);
}
