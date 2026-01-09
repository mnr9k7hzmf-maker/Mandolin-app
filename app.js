/***********************
 * MULTI-INSTRUMENT ENGINE
 ***********************/

const instruments = {
  mandolin: {
    strings: ["G", "D", "A", "E"],
    tuning: {
      G: ["G3","G#3","A3","A#3","B3","C4","C#4"],
      D: ["D4","D#4","E4","F4","F#4","G4","G#4"],
      A: ["A4","A#4","B4","C5","C#5","D5","D#5"],
      E: ["E5","F5","F#5","G5","G#5","A5","A#5"]
    },
    fingers: [1,2,3,4]
  },

  bass: {
    strings: ["E","A","D","G"],
    tuning: {
      E: ["E1","F1","F#1","G1","G#1","A1","A#1"],
      A: ["A1","A#1","B1","C2","C#2","D2","D#2"],
      D: ["D2","D#2","E2","F2","F#2","G2","G#2"],
      G: ["G2","G#2","A2","A#2","B2","C3","C#3"]
    },
    fingers: [1,2,4]
  }
};

const scales = {
  chromatic: null,
  g: ["G","A","B","C","D","E","F#"],
  d: ["D","E","F#","G","A","B","C#"],
  a: ["A","B","C#","D","E","F#","G#"]
};

/* ===== STATE ===== */

let instrument = localStorage.getItem("instrument") || "mandolin";
let settings = {
  scale: "chromatic",
  string: "all",
  maxFret: 6
};

let mode = "practice";
let notes = [];
let target = null;

/* ===== DOM ===== */

const fretboard = document.getElementById("fretboard");
const instrumentSelect = document.getElementById("instrumentSelect");
const scaleSelect = document.getElementById("scaleSelect");
const stringSelect = document.getElementById("stringSelect");
const fretRange = document.getElementById("fretRange");
const fretValue = document.getElementById("fretValue");
const targetDiv = document.getElementById("targetNote");
const instructionDiv = document.getElementById("instruction");
const statusDiv = document.getElementById("status");

instrumentSelect.value = instrument;
instrumentSelect.onchange = e => {
  instrument = e.target.value;
  localStorage.setItem("instrument", instrument);
  rebuild();
};

/* ===== MODES ===== */

document.querySelectorAll(".modes button").forEach(b =>
  b.onclick = () => mode = b.dataset.mode
);

/* ===== BUILD ===== */

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
      notes.push({ string, fret, note });
    });
  });
}

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

/* ===== TARGET ===== */

function pickTarget() {
  if (!notes.length) return;
  target = notes[Math.floor(Math.random() * notes.length)];
  targetDiv.textContent = `Play: ${target.note}`;
  instructionDiv.textContent = `String: ${target.string} | Fret: ${target.fret}`;
  highlightTarget();
}

function highlightTarget() {
  document.querySelectorAll(".dot").forEach(d => d.classList.remove("active"));
  document.querySelectorAll(".fret").forEach(cell => {
    if (
      cell.dataset.string === target.string &&
      Number(cell.dataset.fret) === target.fret
    ) {
      cell.querySelector(".dot").classList.add("active");
    }
  });
}

/* ===== INIT ===== */
rebuild();
