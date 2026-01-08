function autoCorrelate(buffer, sampleRate) {
  let SIZE = buffer.length;
  let rms = 0;

  for (let i = 0; i < SIZE; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1;

  let r1 = 0, r2 = SIZE - 1;
  while (buffer[r1] < 0.001) r1++;
  while (buffer[r2] < 0.001) r2--;

  buffer = buffer.slice(r1, r2);
  SIZE = buffer.length;

  let c = new Array(SIZE).fill(0);
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE - i; j++) {
      c[i] += buffer[j] * buffer[j + i];
    }
  }

  let d = 0;
  while (c[d] > c[d + 1]) d++;

  let max = -1;
  let pos = -1;
  for (let i = d; i < SIZE; i++) {
    if (c[i] > max) {
      max = c[i];
      pos = i;
    }
  }

  return sampleRate / pos;
}

function frequencyToNote(freq) {
  const A4 = 440;
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const midi = Math.round(12 * Math.log2(freq / A4)) + 69;
  const note = noteNames[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return note + octave;
}