// Background music control: play/pause and volume. Wraps the native <audio>
// element. Browsers block autoplay with sound, so playback starts only on the
// user's click — never automatically.

import { els, toast } from "./ui.js";

export function initPlayer() {
  const audio = els.audio;
  audio.volume = parseFloat(els.volume.value);

  els.playBtn.addEventListener("click", () => {
    if (audio.paused) {
      const started = audio.play();
      // play() returns a promise that rejects if the browser blocks it.
      if (started && typeof started.catch === "function") {
        started.catch(() => toast("El navegador bloqueó la reproducción.", "error"));
      }
    } else {
      audio.pause();
    }
  });

  // Drive the icon off the real audio state so it stays correct even if
  // playback ends or is interrupted by the browser.
  audio.addEventListener("play", () => setPlayingUI(true));
  audio.addEventListener("pause", () => setPlayingUI(false));

  els.volume.addEventListener("input", () => {
    audio.volume = parseFloat(els.volume.value);
  });

  attemptAutoplay(audio);
}

// Browsers block autoplay with sound until the user interacts with the page.
// We try to play immediately; if blocked, we start on the first interaction
// (click or keypress) anywhere on the page, then drop the listeners.
function attemptAutoplay(audio) {
  const started = audio.play();
  if (started && typeof started.catch === "function") {
    started.catch(() => armFirstInteraction(audio));
  }
}

function armFirstInteraction(audio) {
  const start = () => {
    audio.play().catch(() => {});
    window.removeEventListener("pointerdown", start);
    window.removeEventListener("keydown", start);
  };
  window.addEventListener("pointerdown", start, { once: true });
  window.addEventListener("keydown", start, { once: true });
}

function setPlayingUI(playing) {
  els.iconPlay.classList.toggle("hidden", playing);
  els.iconPause.classList.toggle("hidden", !playing);
  els.playBtn.setAttribute("aria-label", playing ? "Pausar" : "Reproducir");
}
