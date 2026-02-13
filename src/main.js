import { AudioAnalyzer } from './audio.js';
import { WaveformVisualizer } from './visualizer.js';
import { PRESETS, mergePreset } from './presets.js';

// Elements
const canvas = document.getElementById('visualizer');
const startScreen = document.getElementById('start-screen');
const systemAudioBtn = document.getElementById('system-audio');
const micBtn = document.getElementById('mic');
const panel = document.getElementById('panel');
const panelTrigger = document.getElementById('panel-trigger');
const modeDisplay = document.getElementById('mode-display');
const bpmDisplay = document.getElementById('bpm-display');
const beatIndicator = document.getElementById('beat-indicator');
const energyDisplay = document.getElementById('energy-display');

let audio = null;
let visualizer = null;
let isRunning = false;
let currentSettings = { ...PRESETS.default };
let panelVisible = false;
let panelTimeout = null;

// Initialize visualizer
try {
  visualizer = new WaveformVisualizer(canvas);
  console.log('Visualizer initialized');
} catch (e) {
  console.error('Init error:', e);
  document.body.innerHTML = '<div style="color:red;padding:20px;font-family:monospace;">Init Error: ' + e.message + '</div>';
}

// Panel show/hide
function showPanel() {
  panel.classList.add('visible');
  panelVisible = true;
  clearTimeout(panelTimeout);
}

function hidePanel() {
  panel.classList.remove('visible');
  panelVisible = false;
}

function scheduleHidePanel() {
  clearTimeout(panelTimeout);
  panelTimeout = setTimeout(hidePanel, 2000);
}

panelTrigger.addEventListener('mouseenter', showPanel);
panel.addEventListener('mouseenter', () => {
  showPanel();
  clearTimeout(panelTimeout);
});
panel.addEventListener('mouseleave', scheduleHidePanel);

// Touch support
let touchStartX = 0;
document.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
});

document.addEventListener('touchend', (e) => {
  const touchEndX = e.changedTouches[0].clientX;
  const diff = touchStartX - touchEndX;
  if (diff < -50 && touchEndX > window.innerWidth - 100) {
    showPanel();
  } else if (diff > 50 && panelVisible) {
    hidePanel();
  }
});

// Accordion
document.querySelectorAll('.accordion-header').forEach(header => {
  header.addEventListener('click', () => {
    const item = header.parentElement;
    const wasOpen = item.classList.contains('open');
    // Close all
    document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('open'));
    // Toggle current
    if (!wasOpen) item.classList.add('open');
  });
});

// Mode buttons
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const mode = parseInt(btn.dataset.mode);
    visualizer?.setMode(mode);
    updateActiveModeBtn(mode);
  });
});

function updateActiveModeBtn(mode) {
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.mode-btn[data-mode="${mode}"]`)?.classList.add('active');
}

// Mode change event
window.addEventListener('modechange', (e) => {
  updateActiveModeBtn(visualizer?.currentModeIndex || 0);
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

// Presets
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const presetName = btn.dataset.preset;
    if (PRESETS[presetName]) {
      currentSettings = mergePreset(PRESETS.default, PRESETS[presetName]);
      applySettings(currentSettings);
      updateUIFromSettings();
    }
  });
});

document.getElementById('save-preset')?.addEventListener('click', () => {
  localStorage.setItem('customPreset', JSON.stringify(currentSettings));
  alert('Preset saved!');
});

document.getElementById('load-preset')?.addEventListener('click', () => {
  const saved = localStorage.getItem('customPreset');
  if (saved) {
    currentSettings = JSON.parse(saved);
    applySettings(currentSettings);
    updateUIFromSettings();
  }
});

// Export/Import modal
const modal = document.getElementById('preset-modal');
const modalTitle = document.getElementById('modal-title');
const presetJson = document.getElementById('preset-json');
const modalCopy = document.getElementById('modal-copy');
const modalApply = document.getElementById('modal-apply');
const modalClose = document.getElementById('modal-close');

document.getElementById('export-preset')?.addEventListener('click', () => {
  modalTitle.textContent = 'Export Preset';
  presetJson.value = JSON.stringify(currentSettings, null, 2);
  presetJson.readOnly = true;
  modalCopy.classList.remove('hidden');
  modalApply.classList.add('hidden');
  modal.classList.remove('hidden');
});

document.getElementById('import-preset')?.addEventListener('click', () => {
  modalTitle.textContent = 'Import Preset';
  presetJson.value = '';
  presetJson.readOnly = false;
  presetJson.placeholder = 'Paste preset JSON here...';
  modalCopy.classList.add('hidden');
  modalApply.classList.remove('hidden');
  modal.classList.remove('hidden');
});

modalCopy?.addEventListener('click', () => {
  presetJson.select();
  navigator.clipboard.writeText(presetJson.value);
  modalCopy.textContent = 'COPIED!';
  setTimeout(() => modalCopy.textContent = 'COPY', 1500);
});

modalApply?.addEventListener('click', () => {
  try {
    const imported = JSON.parse(presetJson.value);
    currentSettings = mergePreset(PRESETS.default, imported);
    applySettings(currentSettings);
    updateUIFromSettings();
    modal.classList.add('hidden');
  } catch (e) {
    alert('Invalid JSON: ' + e.message);
  }
});

modalClose?.addEventListener('click', () => modal.classList.add('hidden'));
modal?.addEventListener('click', (e) => {
  if (e.target === modal) modal.classList.add('hidden');
});

// Transition style
document.getElementById('transition-style')?.addEventListener('change', (e) => {
  if (visualizer) visualizer.transitionStyle = e.target.value;
});

function applySettings(s) {
  if (!visualizer) return;
  visualizer.updateSettings(s);
}

function updateUIFromSettings() {
  const s = currentSettings;
  setValue('custom-text', s.text || 'NAKUL');
  setValue('font-select', s.font || 'Bebas Neue');
  setValue('text-anim', s.textAnim || 'pulse');
  setValue('text-size', s.textSize);
  setValue('text-opacity', s.textOpacity);
  setValue('text-reactivity', s.textReactivity);
  setValue('text-glow', s.textGlow);
  setValue('text-color', s.textColor);
  setChecked('text-outline', s.textOutline);
  setValue('text-outline-color', s.textOutlineColor || '#000000');
  setValue('color-primary', s.colorPrimary);
  setValue('color-secondary', s.colorSecondary);
  setValue('color-bg', s.colorBg);
  setValue('saturation', s.saturation);
  setValue('temperature', s.temperature);
  setChecked('color-cycle', s.colorCycle);
  setValue('cycle-speed', s.cycleSpeed);
  setValue('bloom', s.bloom);
  setValue('glitch', s.glitch);
  setValue('chromatic', s.chromatic);
  setValue('scanlines', s.scanlines);
  setValue('noise', s.noise);
  setValue('vignette', s.vignette);
  setValue('shake', s.shake);
  setChecked('beat-flash', s.beatFlash);
  setChecked('invert', s.invert);
  setChecked('motion-blur', s.motionBlur);
  setValue('sensitivity', s.sensitivity);
  setValue('anim-speed', s.animSpeed);
  setValue('trail-length', s.trailLength);
  setValue('particle-density', s.particleDensity);
  setValue('zoom-pulse', s.zoomPulse);
  setValue('scene-rotation', s.sceneRotation);
  setChecked('mirror-x', s.mirrorX);
  setChecked('mirror-y', s.mirrorY);
  setChecked('auto-cycle', s.autoCycle);
  setValue('auto-cycle-beats', s.autoCycleBeats);
  setValue('auto-cycle-mode', s.autoCycleMode);
  // Audio reactivity
  setValue('bass-react', s.bassReact || 1);
  setValue('mids-react', s.midsReact || 1);
  setValue('highs-react', s.highsReact || 1);
  setChecked('beat-pulse', s.beatPulse !== false);
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el && val !== undefined) el.value = val;
}

function setChecked(id, val) {
  const el = document.getElementById(id);
  if (el) el.checked = !!val;
}

// Bind all controls
function bindControl(id, key, isCheckbox = false, isNumber = true) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener(isCheckbox ? 'change' : 'input', (e) => {
    let val = isCheckbox ? e.target.checked : e.target.value;
    if (isNumber && !isCheckbox) val = parseFloat(val);
    currentSettings[key] = val;
    applySettings({ [key]: val });
  });
}

// Text
bindControl('custom-text', 'text', false, false);
bindControl('font-select', 'font', false, false);
bindControl('text-anim', 'textAnim', false, false);
bindControl('text-size', 'textSize');
bindControl('text-opacity', 'textOpacity');
bindControl('text-reactivity', 'textReactivity');
bindControl('text-glow', 'textGlow');
bindControl('text-color', 'textColor', false, false);
bindControl('text-outline', 'textOutline', true);
bindControl('text-outline-color', 'textOutlineColor', false, false);

// Colors
bindControl('color-primary', 'colorPrimary', false, false);
bindControl('color-secondary', 'colorSecondary', false, false);
bindControl('color-bg', 'colorBg', false, false);
bindControl('saturation', 'saturation');
bindControl('temperature', 'temperature');
bindControl('color-cycle', 'colorCycle', true);
bindControl('cycle-speed', 'cycleSpeed');

// Effects
bindControl('bloom', 'bloom');
bindControl('glitch', 'glitch');
bindControl('chromatic', 'chromatic');
bindControl('scanlines', 'scanlines');
bindControl('noise', 'noise');
bindControl('vignette', 'vignette');
bindControl('shake', 'shake');
bindControl('beat-flash', 'beatFlash', true);
bindControl('invert', 'invert', true);
bindControl('motion-blur', 'motionBlur', true);

// Visual
bindControl('sensitivity', 'sensitivity');
bindControl('anim-speed', 'animSpeed');
bindControl('trail-length', 'trailLength');
bindControl('particle-density', 'particleDensity');
bindControl('zoom-pulse', 'zoomPulse');
bindControl('scene-rotation', 'sceneRotation');
bindControl('mirror-x', 'mirrorX', true);
bindControl('mirror-y', 'mirrorY', true);

// Auto-cycle
bindControl('auto-cycle', 'autoCycle', true);
bindControl('auto-cycle-beats', 'autoCycleBeats', false, true);
bindControl('auto-cycle-mode', 'autoCycleMode', false, false);

// Audio reactivity
bindControl('bass-react', 'bassReact');
bindControl('mids-react', 'midsReact');
bindControl('highs-react', 'highsReact');
bindControl('beat-pulse', 'beatPulse', true);

// Audio source handlers
async function startWithSource(initFn) {
  try {
    audio = new AudioAnalyzer(2048);
    await initFn();
    startScreen.classList.add('hidden');
    isRunning = true;
    animate();
  } catch (error) {
    console.error('Failed:', error);
    alert(error.message || 'Failed to start audio');
  }
}

systemAudioBtn?.addEventListener('click', () => startWithSource(() => audio.initSystemAudio()));
micBtn?.addEventListener('click', () => startWithSource(() => audio.initMicrophone()));

// Animation loop
function animate() {
  if (!isRunning || !visualizer) return;
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
  
  // Update audio stats display
  if (visualizer.smartAudio) {
    const smart = visualizer.smartAudio;
    bpmDisplay.textContent = Math.round(smart.bpm);
    energyDisplay.textContent = smart.energyState.toUpperCase();
    
    if (smart.onBeat) {
      beatIndicator.classList.add('pulse');
      setTimeout(() => beatIndicator.classList.remove('pulse'), 100);
    }
  }
}

// Keyboard controls
const TOTAL_MODES = 12;

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
  
  if (e.key >= '1' && e.key <= '9') { visualizer?.setMode(parseInt(e.key) - 1); return; }
  if (e.key === '0') { visualizer?.setMode(9); return; }
  
  switch (e.key.toLowerCase()) {
    case 'f': document.documentElement.requestFullscreen(); break;
    case 'escape': document.fullscreenElement && document.exitFullscreen(); break;
    case 'h': panelVisible ? hidePanel() : showPanel(); break;
    case 'arrowright': visualizer?.setMode((visualizer.currentModeIndex + 1) % TOTAL_MODES); break;
    case 'arrowleft': visualizer?.setMode((visualizer.currentModeIndex + TOTAL_MODES - 1) % TOTAL_MODES); break;
    case 'k': visualizer?.setMode(10); break;
    case 'l': visualizer?.setMode(11); break;
  }
});

canvas?.addEventListener('dblclick', () => {
  document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
});

document.addEventListener('contextmenu', (e) => e.preventDefault());

// Static render for preview
function staticRender() {
  if (isRunning || !visualizer) return;
  requestAnimationFrame(staticRender);
  visualizer.update({
    waveform: new Uint8Array(512).fill(128),
    frequencies: new Uint8Array(512).fill(0),
    volume: 0, bass: 0, mids: 0, highs: 0
  });
}

// Initialize
if (visualizer) {
  staticRender();
  visualizer.setMode(0);
  applySettings(currentSettings);
  updateUIFromSettings();
}
