const strings = [
  { note: "G3", freq: 196.0 },
  { note: "D4", freq: 293.66 },
  { note: "A4", freq: 440.0 },
  { note: "E5", freq: 659.25 }
];

const targetDiv = document.getElementById("target");
const statusDiv = document.getElementById("status");
const startBtn = document.getElementById("start");

let audioContext;
let analyser;
let data;
let target;

startBtn.addEventListener("click", async () => {
  startBtn.disabled = true;
  pickNewTarget();

  audioContext = new AudioContext();
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const source = audioContext.createMediaStreamSource(stream);

  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  data = new Float32Array(analyser.fftSize);

  source.connect(analyser);
  listen();
});

function pickNewTarget() {
  target = strings[Math.floor(Math.random() * strings.length)];
  targetDiv.textContent = `Play: ${target.note} (Open String)`;
  statusDiv.textContent = "Listening…";
  statusDiv.className = "waiting";
}

function listen() {
  analyser.getFloatTimeDomainData(data);
  const freq = autoCorrelate(data, audioContext.sampleRate);

  if (freq !== -1) {
    const detected = frequencyToNote(freq);

    if (detected === target.note) {
      statusDiv.textContent = `Correct ✔ (${detected})`;
      statusDiv.className = "correct";
      setTimeout(pickNewTarget, 1000);
    } else {
      statusDiv.textContent = `Heard ${detected}`;
      statusDiv.className = "incorrect";
    }
  }

  requestAnimationFrame(listen);
}