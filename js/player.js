// Background music: a dynamic playlist with play/pause, prev/next and volume.
// Wraps the native <audio> element. Browsers block autoplay with sound, so the
// first track starts on the user's first interaction if autoplay is blocked.
//
// TO ADD A SONG: drop the .mp3 in assets/sounds and add its filename below.
// The first entry plays first. The displayed title is derived from the filename.

import { els, toast } from "./ui.js";

const SOUNDS_DIR = "assets/sounds";

const TRACK_FILES = [
  "Patricio Rey y sus Redonditos de Ricota - Jijiji (Audio Oficial).mp3",
  "Patricio Rey y sus Redonditos de Ricota - Nuestro Amo Juega al Esclavo (Audio Oficial).mp3",
  "Patricio Rey y sus Redonditos de Ricota - Tarea Fina (Audio Oficial).mp3",
];

const playlist = TRACK_FILES.map((file) => ({
  // Spaces and parentheses must be percent-encoded to load reliably.
  src: `${SOUNDS_DIR}/${encodeURIComponent(file)}`,
  title: fileToTitle(file),
}));

let current = 0;

export function initPlayer() {
  if (playlist.length === 0) return;
  const audio = els.audio;

  audio.volume = parseFloat(els.volume.value);
  load(0, false); // cue the first track without forcing playback yet

  els.playBtn.addEventListener("click", togglePlay);
  els.prevBtn.addEventListener("click", () => skip(-1));
  els.nextBtn.addEventListener("click", () => skip(1));

  // Drive the icon off the real audio state, not the click — stays correct even
  // if playback ends or the browser interrupts it.
  audio.addEventListener("play", () => setPlayingUI(true));
  audio.addEventListener("pause", () => setPlayingUI(false));

  // When a track ends, advance to the next (wrapping). With a single track,
  // restart it — setting the same src again does not reliably reload.
  audio.addEventListener("ended", () => {
    if (playlist.length === 1) {
      audio.currentTime = 0;
      playSafe();
    } else {
      skip(1);
    }
  });

  els.volume.addEventListener("input", () => {
    audio.volume = parseFloat(els.volume.value);
  });

  attemptAutoplay();
}

function load(index, autoplay = true) {
  current = (index + playlist.length) % playlist.length;
  const track = playlist[current];
  els.audio.src = track.src;
  els.trackTitle.textContent = track.title;
  if (autoplay) playSafe();
}

function skip(delta) {
  // prev/next are user gestures, so playback is allowed to start.
  load(current + delta, true);
}

function togglePlay() {
  if (els.audio.paused) playSafe(true);
  else els.audio.pause();
}

// notifyOnBlock: only surface an error when the user explicitly pressed play.
function playSafe(notifyOnBlock = false) {
  const started = els.audio.play();
  if (started && typeof started.catch === "function") {
    started.catch(() => {
      if (notifyOnBlock) toast("El navegador bloqueó la reproducción.", "error");
    });
  }
}

// Try to play on load; if the browser blocks it, start on the first interaction
// (click or keypress) anywhere on the page, then drop the listeners.
function attemptAutoplay() {
  const started = els.audio.play();
  if (started && typeof started.catch === "function") {
    started.catch(armFirstInteraction);
  }
}

function armFirstInteraction() {
  const start = () => {
    playSafe();
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

// Derives a readable title from a filename. Handles two shapes:
//   "Artist - Title (Audio Oficial).mp3"  ->  "Title"   (casing preserved)
//   "kebab-case-name.mp3"                 ->  "Kebab Case Name"
function fileToTitle(file) {
  let name = file.replace(/\.[^.]+$/, "").trim();   // strip extension
  const hadSpaces = /\s/.test(name);
  name = name.replace(/\s*\([^)]*\)\s*$/, "").trim(); // strip trailing "(...)"
  if (name.includes(" - ")) {
    name = name.split(" - ").slice(1).join(" - ").trim(); // title after artist
  }
  if (!hadSpaces) {
    name = name.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
    name = name.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return name;
}
