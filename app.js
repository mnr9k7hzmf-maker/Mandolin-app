/********************************
 * SINGLE PAGE FRET TRAINER
 * Clean + iOS Safe
 ********************************/

/* ======================
   INSTRUMENT DATA
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

let instrument = "mandolin";
let mode = null;

let settings = {
  scale: "chromatic",
  maxFret: 6
};

let notes = [];
let target = null;

let listening = false;
let audioCtx, analyser, buffer, stream, raf;

/* ======================
   DOM
====================== */

const screens = document.querySelectorAll(".screen");

const instrumentSelect = document.getElementById("instrumentSelect");
const scaleSelect = document.getElementById("scaleSelect");
const fretRange = document.getElementById("fretRange");
const fretValue = document.getElementById("fretValue");

const trainerTarget = document.getElementById("trainerTarget");
const tunerTarget = document.getElementById("tunerTarget");

const instructionDiv = document.getElementById("instruction");
const trainerStatus = document.getElementById("trainerStatus");
const tunerStatus = document.getElementById("tunerStatus");

const fretboard = document.getElementById("fretboard");
const modeTitle = document.getElementById("modeTitle");

const trainerStart = document.getElementById("trainerStart");
const trainerStop = document.getElementById("trainerStop");
const tunerStart = document.getElementById("tunerStart");
const tunerStop = document.getElementById("tunerStop");

/* ======================
   SCREEN CONTROL
====================== */

function showScreen(id) {
  screens.forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

document.querySelectorAll(".mode-buttons button").forEach(btn => {
  btn.onclick = () => {
    mode = btn.dataset.mode;
    enterMode();
  };
});

document.querySelectorAll(".back").forEach(btn => {
  btn.onclick = () => {
    stopListening();
    showScreen("home");
  };
});

/* ======================
   SETTINGS
====================== */

instrumentSelect.onchange = e => instrument = e.target.value;

scaleSelect.onchange = e => {
  settings.scale = e.target.value;
  rebuild();
};

fretRange.oninput = e => {
  settings.maxFret = Number(e.target.value);
  fretValue.textContent = settings.maxFret;
  rebuild();
};

/* ======================
   MODE ENTRY
====================== */

function enterMode() {
  stopListening();

  if (mode === "tuner") {
    showScreen("tuner");
    tunerTarget.textContent = "—";
    tunerStatus.textContent = "Listening…";
    return;
  }

  modeTitle.textContent =
    `${instrument.charAt(0).toUpperCase() + instrument.slice(1)} ${mode}`;

  showScreen("trainer");
  rebuild();
}

/* ======================
   NOTE LOGIC
====================== */

function rebuild() {
  buildNotes();
  buildFretboard();
  pickTarget();
}

function buildNotes() {
  notes = [];
  const inst = instruments[instrument];

  inst.strings.forEach(string => {
    inst.tuning[string].forEach((note, fret) => {
      if (fret === 0 || fret > settings.maxFret) return;

      if (settings.scale !== "chromatic") {
        const pitch = note.replace(/[0-9]/g, "");
        if (!scales[settings.scale].includes(pitch)) return;
      }

      notes.push({ string, fret, note });
    });
  });
}

/* ======================
   FRETBOARD
====================== */

function buildFretboard() {
  fretboard.innerHTML = "";
  const inst = instruments[instrument];

  inst.strings.forEach(string => {
    const row = document.createElement("div");
    row.className = "string-row";

    const label = document.createElement("div");
    label.className = "string-label";
    label.textContent = string;
    row.appendChild(label);

    inst.tuning[string].forEach((note, fret) => {
      if (fret === 0 || fret > settings.maxFret) return;

      const cell = document.createElement("div");
      cell.className = "fret";
      cell.dataset.string = string;
      cell.dataset.fret = fret;

      const dot = document.createElement("div");
      dot.className = "dot";

      cell.appendChild(dot);
      row.appendChild(cell);
    });

    fretboard.appendChild(row);
  });
}

/* ======================
   TARGET
====================== */

function pickTarget() {
  if (!notes.length) return;

  target = notes[Math.floor(Math.random() * notes.length)];
  trainerTarget.textContent = `Play: ${target.note}`;
  instructionDiv.textContent =
    `String: ${target.string} | Fret: ${target.fret}`;

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
   AUDIO
====================== */

trainerStart.onclick = startListening;
trainerStop.onclick = stopListening;
tunerStart.onclick = startListening;
tunerStop.onclick = stopListening;

async function startListening() {
  if (listening) return;
  listening = true;

  trainerStart.disabled = true;
  trainerStop.disabled = false;
  tunerStart.disabled = true;
  tunerStop.disabled = false;

  audioCtx = new AudioContext();
  stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  const source = audioCtx.createMediaStreamSource(stream);
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  buffer = new Float32Array(analyser.fftSize);

  source.connect(analyser);
  listenLoop();
}

function stopListening() {
  listening = false;

  cancelAnimationFrame(raf);
  if (stream) stream.getTracks().forEach(t => t.stop());
  if (audioCtx) audioCtx.close();

  trainerStart.disabled = false;
  trainerStop.disabled = true;
  tunerStart.disabled = false;
  tunerStop.disabled = true;
}

function listenLoop() {
  if (!listening) return;

  analyser.getFloatTimeDomainData(buffer);
  const freq = autoCorrelate(buffer, audioCtx.sampleRate);

  if (freq !== -1) {
    const detected = frequencyToNote(freq);

    if (mode === "tuner") {
      tunerTarget.textContent = detected;
    } else if (target && detected === target.note) {
      trainerStatus.textContent = "Correct ✔";
      pickTarget();
    }
  }

  raf = requestAnimationFrame(listenLoop);
}
