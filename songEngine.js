(function () {
  let audioCtx;
  let instrument = "mandolin";

  window.initSongEngine = function (inst) {
    instrument = inst;
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    renderUI();
  };

  function renderUI() {
    const container = document.getElementById("songEngine");
    container.innerHTML = `
      <button id="songPlay">Play</button>
      <button id="songPause">Pause</button>
      <label>Tempo <input id="songTempo" type="number" value="96"></label>
      <label>Transpose <input id="songTranspose" type="number" value="0"></label>
      <button id="songMetro">Metronome</button>
    `;
  }

})();
