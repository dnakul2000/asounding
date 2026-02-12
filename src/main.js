import { AudioAnalyzer } from './audio.js';
import { WaveformVisualizer } from './visualizer.js';

const canvas = document.getElementById('visualizer');
const controls = document.getElementById('controls');
const sourceButtons = document.getElementById('source-buttons');
const systemAudioBtn = document.getElementById('system-audio');
const micBtn = document.getElementById('mic');
const hint = document.getElementById('hint');
const settings = document.getElementById('settings');
const zoomHint = document.getElementById('zoom-hint');
const modeDisplay = document.getElementById('mode-display');

// Controls
const customTextInput = document.getElementById('custom-text');
const fontSelect = document.getElementById('font-select');
const textSizeInput = document.getElementById('text-size');
const textOpacityInput = document.getElementById('text-opacity');
const textReactivityInput = document.getElementById('text-reactivity');
const sensitivityInput = document.getElementById('sensitivity');
const bloomInput = document.getElementById('bloom');

let audio = null;
let visualizer = null;
let isRunning = false;
let hideTimeout = null;
let controlsVisible = true;

try {
  visualizer = new WaveformVisualizer(canvas);
  console.log('Visualizer initialized');
} catch (e) {
  console.error('Failed to init visualizer:', e);
}

window.addEventListener('modechange', (e) => {
  if (modeDisplay) {
    modeDisplay.textContent = e.detail.name;
    modeDisplay.classList.remove('hidden');
    modeDisplay.classList.add('show');
    setTimeout(() => {
      modeDisplay.classList.remove('show');
      setTimeout(() => modeDisplay.classList.add('hidden'), 300);
    }, 1500);
  }
});

function showControls() {
  controls.classList.remove('hidden');
  if (zoomHint) zoomHint.classList.remove('hidden');
  controlsVisible = true;
  clearTimeout(hideTimeout);
  if (isRunning) {
    hideTimeout = setTimeout(() => {
      controls.classList.add('hidden');
      if (zoomHint) zoomHint.classList.add('hidden');
      controlsVisible = false;
    }, 4000);
  }
}

function hideSourceUI() {
  sourceButtons.classList.add('autohide');
  hint.classList.add('autohide');
  settings.classList.remove('autohide');
  showControls();
}

async function startWithSource(initFn) {
  try {
    audio = new AudioAnalyzer(2048);
    await initFn();
    hideSourceUI();
    isRunning = true;
    animate();
  } catch (error) {
    console.error('Failed to start:', error);
    hint.textContent = error.message || 'Failed to access audio source';
    hint.style.color = '#ff6b6b';
  }
}

systemAudioBtn.addEventListener('click', () => {
  console.log('System audio clicked');
  startWithSource(() => audio.initSystemAudio());
});
micBtn.addEventListener('click', () => {
  console.log('Mic clicked');
  startWithSource(() => audio.initMicrophone());
});

function animate() {
  if (!isRunning) return;
  requestAnimationFrame(animate);
  visualizer.update({
    waveform: audio.getWaveform(),
    frequencies: audio.getFrequencies(),
    volume: audio.getVolume(),
    bass: audio.getBass(),
    mids: audio.getMids(),
    highs: audio.getHighs()
  });
}

// Control handlers
customTextInput?.addEventListener('input', (e) => visualizer.updateSettings({ text: e.target.value }));
fontSelect?.addEventListener('change', (e) => visualizer.updateSettings({ font: e.target.value }));
textSizeInput?.addEventListener('input', (e) => visualizer.updateSettings({ textSize: parseFloat(e.target.value) }));
textOpacityInput?.addEventListener('input', (e) => visualizer.updateSettings({ textOpacity: parseFloat(e.target.value) }));
textReactivityInput?.addEventListener('input', (e) => visualizer.updateSettings({ textReactivity: parseFloat(e.target.value) }));
sensitivityInput?.addEventListener('input', (e) => visualizer.updateSettings({ sensitivity: parseFloat(e.target.value) }));
bloomInput?.addEventListener('input', (e) => visualizer.updateSettings({ bloomIntensity: parseFloat(e.target.value) }));

document.addEventListener('mousemove', showControls);
document.addEventListener('touchstart', showControls);

canvas.addEventListener('dblclick', () => {
  document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
});

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  
  if (e.key >= '1' && e.key <= '9') { visualizer.setMode(parseInt(e.key) - 1); return; }
  if (e.key === '0') { visualizer.setMode(9); return; }
  
  switch (e.key) {
    case 'f': document.documentElement.requestFullscreen(); break;
    case 'Escape': document.fullscreenElement && document.exitFullscreen(); break;
    case ' ': audio?.audioElement && (audio.audioElement.paused ? audio.play() : audio.pause()); e.preventDefault(); break;
    case 'h': controlsVisible ? (controls.classList.add('hidden'), zoomHint?.classList.add('hidden'), controlsVisible = false) : showControls(); break;
    case 'ArrowRight': visualizer.setMode((visualizer.currentModeIndex + 1) % 10); break;
    case 'ArrowLeft': visualizer.setMode((visualizer.currentModeIndex + 9) % 10); break;
  }
});

document.addEventListener('contextmenu', (e) => e.preventDefault());

function staticRender() {
  if (isRunning) return;
  requestAnimationFrame(staticRender);
  visualizer.update({ waveform: new Uint8Array(512).fill(128), frequencies: new Uint8Array(512).fill(0), volume: 0, bass: 0, mids: 0, highs: 0 });
}

staticRender();
visualizer.setMode(0);
