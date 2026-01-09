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

let settings = JSON.parse(localStorage.getItem("mandolinSettings")) || {
  difficulty: "beginner",
  maxFret: 2,
  scale: "g",
  string: "all"
};

let notes = [];
let target = null;

const fretboard = document.getElementById("fretboard");
const targetDiv = document.getElementById("targetNote");
const instructionDiv = document.getElementById("instruction");
const status = document.getElementById("status");

const fretRange = document.getElementById("fretRange");
const fretValue = document.getElementById("fretValue");
const scaleSelect = document.getElementById("scaleSelect");
const stringSelect = document.getElementById("stringSelect");
const difficultySelect = document.getElementById("difficulty");

fretRange.oninput = e => update({ maxFret: +e.target.value });
scaleSelect.onchange = e => update({ scale: e.target.value });
stringSelect.onchange = e => update({ string: e.target.value });
difficultySelect.onchange = e => applyPreset(e.target.value);

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

/* ===== BUILD ===== */

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

    frets.slice(0, settings.maxFret + 1).forEach((note, fret) => {
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
      cell.dataset.string = string;
      cell.dataset.fret = fret;
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

/* ===== TARGET ===== */

function pickTarget() {
  if (!notes.length) return;
  target = notes[Math.floor(Math.random() * notes.length)];
  targetDiv.textContent = "Play: " + target.note;
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
