/*************************
 * MULTI-INSTRUMENT TRAINER
 * Clean, stable version
 * NO finger numbers
 *************************/

/* ======================
   INSTRUMENT DEFINITIONS
====================== */

const instruments = {
  mandolin: {
    strings: ["G", "D", "A", "E"],
    tuning: {
      G: ["G3","G#3","A3","A#3","B3","C4","C#4"],
      D: ["D4","D#4","E4","F4","F#4","G4","G#4"],
      A: ["A4","A#4","B4","C5","C#5","D5","D#5"],
      E: ["E5","F5","F#5","G5","G#5","A5","A#5"]
    }
  },

  bass: {
    strings: ["E", "A", "D", "G"],
    tuning: {
      E: ["E1","F1","F#1","G1","G#1","A1","A#1"],
      A: ["A1","A#1","B1","C2","C#2","D2","D#2"],
      D: ["D2","D#2","E2","F2","F#2","G2","G#2"],
      G: ["G2","G#2","A2","A#2","B2","C3","C#3"]
    }
  }
};

const scales = {
  chromatic: null,
  g: ["G","A","B","C","D","E","F#"],
  d: ["D","E","F#","G","A","B","C#"],
  a: ["A","B","C#","D","E","F#","G#"]
};

/* ======================
   STATE
====================== */

let instrument = localStorage.getItem("instrument") || "mandolin";

let settings = {
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

/* ======================
   DOM
====================== */

const fretboard = document.getElementById("fretboard");
const instrumentSelect = document.getElementById("instrumentSelect");
const scaleSelect = document.getElementById("scaleSelect");
const stringSelect = document.getElementById("stringSelect");
const fretRange = document.getElementById("fretRange");
const fretValue = document.getElementById("fretValue");

const targetDiv = document.getElementById("targetNote");
const instructionDiv = document.getElementById("instruction");
const statusDiv = document.getElementById("status");

const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");

/* ======================
   INIT UI
====================== */

instrumentSelect.value = instrument;
fretRange.value = settings.maxFret;
fretValue.textContent = settings.maxFret;

/* ======================
   UI EVENTS
====================== */

instrumentSelect.onchange = e => {
  instrument = e.target.value;
  localStorage.setItem("instrument", instrument);
  rebuild();
};

scaleSelect.onchange = e => {
  settings.scale = e.target.value;
  rebuild();
};

stringSelect.onchange = e => {
  settings.string = e.target.value;
  rebuild();
};

fretRange.oninput = e => {
  settings.maxFret = Number(e.target.value);
  fretValue.textContent = settings.maxFret;
  rebuild();
};

document.querySelectorAll(".modes button").forEach(btn => {
  btn.onclick = () => mode = btn.dataset.mode;
});

startBtn.onclick = startListening;
stopBtn.onclick = stopListening;

/* ======================
   BUILD FLOW
====================== */

rebuild();

function rebuild() {
  buildNotes();
  buildFretboard();
  pickTarget();
}

/* ======================
   NOTE GENERATION
====================== */

function buildNotes() {
  notes = [];
  const inst = instruments[instrument];

  inst.strings.forEach(string => {
    inst.tuning[string].forEach((note, fret) => {
      if (fret === 0) return;
      if (fret > settings.maxFret) return;

      if (settings.scale !== "chromatic") {
        const pitch = note.replace(/[0-9]/g, "");
        if (!scales[settings.scale].includes(pitch)) return;
      }

      notes.push({ string, fret, note });
    });
  });
}

/* ======================
   FRETBOARD RENDER
====================== */

function buildFretboard() {
  fretboard.innerHTML = "";
  fretboard.dataset.instrument = instrument;

  const inst = instruments[instrument];

  inst.strings.forEach(string => {
    const row = document.createElement("div");
    row.className = "string-row";

    const label = document.createElement("div");
    label.className = "string-label";
    label.textContent = string;
    row.appendChild(label);

    inst.tuning[string].forEach((note, fret) => {
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

/* ======================
   TARGET + HIGHLIGHT
====================== */

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

/* ======================
   AUDIO ENGINE
====================== */

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

/* ======================
   GAME MODE
====================== */

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
