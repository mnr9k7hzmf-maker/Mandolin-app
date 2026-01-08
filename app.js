const strings = [
  { note: "G3", freq: 196.0 },
  { note: "D4", freq: 293.66 },
  { note: "A4", freq: 440.0 },
  { note: "E5", freq: 659.25 }
];

const targetDiv = document.getElementById("target");
const statusDiv = document.getElementById("status");
const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");

let audioContext;
let analyser;
let data;
let target;
let stream;
let listening = false;
let animationId;

startBtn.addEventListener("click", startPractice);
stopBtn.addEventListener("click", stopPractice);

async function startPractice() {
  startBtn.disabled = true;
  stopBtn.disabled = false;
  listening = true;

  pickNewTarget();

  audioContext = new AudioContext();
  stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const source = audioContext.createMediaStreamSource(stream);

  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  data = new Float32Array(analyser.fftSize);

  source.connect(analyser);
  listen();
}

function stopPractice() {
  listening = false;
  startBtn.disabled = false;
  stopBtn.disabled = true;

  if (animationId) cancelAnimationFrame(animationId);
  if (stream) stream.getTracks().forEach(track => track.stop());
  if (audioContext) audioContext.close();

  targetDiv.textContent = "Tap Start";
  statusDiv.textContent = "Stopped";
  statusDiv.className = "waiting";
}

function pickNewTarget() {
  target = strings[Math.floor(Math.random() * strings.length)];
  targetDiv.textContent = `Play: ${target.note} (Open String)`;
  statusDiv.textContent = "Listening…";
  statusDiv.className = "waiting";
}

function listen() {
  if (!listening) return;

  analyser.getFloatTimeDomainData(data);
  const freq = autoCorrelate(data, audioContext.sampleRate);

  if (freq !== -1) {
    const detected = frequencyToNote(freq);

    if (detected === target.note) {
      statusDiv.textContent = `Correct ✔ (${detected})`;
      statusDiv.className = "correct";
      setTimeout(() => {
        if (listening) pickNewTarget();
      }, 800);
    } else {
      statusDiv.textContent = `Heard ${detected}`;
      statusDiv.className = "incorrect";
    }
  }

  animationId = requestAnimationFrame(listen);
}
