import { AudioAnalyzer } from './audio.js';
import { WaveformVisualizer } from './visualizer.js';

// Elements
const canvas = document.getElementById('visualizer');
const controls = document.getElementById('controls');
const sourceButtons = document.getElementById('source-buttons');
const systemAudioBtn = document.getElementById('system-audio');
const micBtn = document.getElementById('mic');
const hint = document.getElementById('hint');
const settings = document.getElementById('settings');
const zoomHint = document.getElementById('zoom-hint');
const modeDisplay = document.getElementById('mode-display');

// Setting inputs
const sensitivityInput = document.getElementById('sensitivity');
const bloomInput = document.getElementById('bloom');

// Core components
let audio = null;
let visualizer = null;
let isRunning = false;
let hideTimeout = null;
let controlsVisible = true;

// Initialize visualizer
visualizer = new WaveformVisualizer(canvas);

// Mode change display
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

// Auto-hide controls
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
    }, 3000);
  }
}

function hideSourceUI() {
  sourceButtons.classList.add('autohide');
  hint.classList.add('autohide');
  settings.classList.remove('autohide');
  showControls();
}

function showError(message) {
  hint.textContent = message;
  hint.style.color = '#ff6b6b';
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
    showError(error.message || 'Failed to access audio source');
  }
}

// Audio source handlers
systemAudioBtn.addEventListener('click', () => {
  startWithSource(() => audio.initSystemAudio());
});

micBtn.addEventListener('click', () => {
  startWithSource(() => audio.initMicrophone());
});

// Animation loop
function animate() {
  if (!isRunning) return;
  
  requestAnimationFrame(animate);
  
  const audioData = {
    waveform: audio.getWaveform(),
    frequencies: audio.getFrequencies(),
    volume: audio.getVolume(),
    bass: audio.getBass(),
    mids: audio.getMids(),
    highs: audio.getHighs()
  };
  
  visualizer.update(audioData);
}

// Settings handlers
if (sensitivityInput) {
  sensitivityInput.addEventListener('input', (e) => {
    visualizer.updateSettings({ sensitivity: parseFloat(e.target.value) });
  });
}

if (bloomInput) {
  bloomInput.addEventListener('input', (e) => {
    visualizer.updateSettings({ bloomIntensity: parseFloat(e.target.value) });
  });
}

// Mouse movement shows controls
document.addEventListener('mousemove', showControls);
document.addEventListener('touchstart', showControls);

// Fullscreen on double-click
canvas.addEventListener('dblclick', () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen();
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  
  // Number keys 1-9, 0 for modes
  if (e.key >= '1' && e.key <= '9') {
    const modeIndex = parseInt(e.key) - 1;
    visualizer.setMode(modeIndex);
    return;
  }
  if (e.key === '0') {
    visualizer.setMode(9);
    return;
  }
  
  switch (e.key) {
    case 'f':
      document.documentElement.requestFullscreen();
      break;
    case 'Escape':
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
      break;
    case ' ':
      if (audio && audio.audioElement) {
        if (audio.audioElement.paused) {
          audio.play();
        } else {
          audio.pause();
        }
      }
      e.preventDefault();
      break;
    case 'h':
      if (controlsVisible) {
        controls.classList.add('hidden');
        if (zoomHint) zoomHint.classList.add('hidden');
        controlsVisible = false;
      } else {
        showControls();
      }
      break;
    case 'ArrowRight':
      visualizer.setMode((visualizer.currentModeIndex + 1) % 10);
      break;
    case 'ArrowLeft':
      visualizer.setMode((visualizer.currentModeIndex + 9) % 10);
      break;
  }
});

// Prevent context menu
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Initial static render
function staticRender() {
  if (isRunning) return;
  
  requestAnimationFrame(staticRender);
  
  visualizer.update({
    waveform: new Uint8Array(512).fill(128),
    frequencies: new Uint8Array(512).fill(0),
    volume: 0,
    bass: 0,
    mids: 0,
    highs: 0
  });
}

staticRender();

// Show initial mode
visualizer.setMode(0);
