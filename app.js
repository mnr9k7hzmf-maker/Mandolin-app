/*************************
 * SHARED APP ENGINE
 * Page-driven (instrument + mode)
 *************************/

/* ======================
   PAGE CONFIG
====================== */

const instrument = document.body.dataset.instrument;
const mode = document.body.dataset.mode;

/* ======================
   STATE
====================== */

let listening = false;
let audioCtx, analyser, buffer, stream, raf;

/* ======================
   DOM (SAFE LOOKUPS)
====================== */

const targetDiv = document.getElementById("targetNote");
const statusDiv = document.getElementById("status");
const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");

/* ======================
   EVENTS
====================== */

if (startBtn) startBtn.onclick = startListening;
if (stopBtn) stopBtn.onclick = stopListening;

/* ======================
   AUDIO ENGINE
====================== */

async function startListening() {
  if (listening) return;
  listening = true;

  if (startBtn) startBtn.disabled = true;
  if (stopBtn) stopBtn.disabled = false;

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

  if (startBtn) startBtn.disabled = false;
  if (stopBtn) stopBtn.disabled = true;

  if (statusDiv) statusDiv.textContent = "Stopped";
}

function listenLoop() {
  if (!listening) return;

  analyser.getFloatTimeDomainData(buffer);
  const freq = autoCorrelate(buffer, audioCtx.sampleRate);

  if (freq !== -1) {
    const detected = frequencyToNote(freq);

    if (mode === "tuner") {
      if (targetDiv) targetDiv.textContent = detected;
      if (statusDiv) statusDiv.textContent = "Listening…";
    }
  }

  raf = requestAnimationFrame(listenLoop);
}
