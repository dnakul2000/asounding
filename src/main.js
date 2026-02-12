import { AudioAnalyzer } from './audio.js';
import { WaveformVisualizer } from './visualizer.js';
import { PRESETS, mergePreset } from './presets.js';

const canvas = document.getElementById('visualizer');
const controls = document.getElementById('controls');
const sourceButtons = document.getElementById('source-buttons');
const systemAudioBtn = document.getElementById('system-audio');
const micBtn = document.getElementById('mic');
const hint = document.getElementById('hint');
const settings = document.getElementById('settings');
const zoomHint = document.getElementById('zoom-hint');
const modeDisplay = document.getElementById('mode-display');

let audio = null;
let visualizer = null;
let isRunning = false;
let hideTimeout = null;
let controlsVisible = true;
let currentSettings = { ...PRESETS.default };

try {
  visualizer = new WaveformVisualizer(canvas);
  console.log('Visualizer initialized');
} catch (e) {
  console.error('Init error:', e);
  document.body.innerHTML = '<div style="color:red;padding:20px;font-family:monospace;">Init Error: ' + e.message + '</div>';
}

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab)?.classList.add('active');
  });
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

modalClose?.addEventListener('click', () => {
  modal.classList.add('hidden');
});

modal?.addEventListener('click', (e) => {
  if (e.target === modal) modal.classList.add('hidden');
});

// Transition style
let transitionStyle = 'fade';
document.getElementById('transition-style')?.addEventListener('change', (e) => {
  transitionStyle = e.target.value;
  if (visualizer) visualizer.transitionStyle = transitionStyle;
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
  // Auto-cycle
  setChecked('auto-cycle', s.autoCycle);
  setValue('auto-cycle-beats', s.autoCycleBeats);
  setValue('auto-cycle-mode', s.autoCycleMode);
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
bindControl('auto-cycle-beats', 'autoCycleBeats', false, true);  // parse as number
bindControl('auto-cycle-mode', 'autoCycleMode', false, false);

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

// Auto-cycle: no display, handled silently with morph effect

function showControls() {
  controls.classList.remove('hidden');
  zoomHint?.classList.remove('hidden');
  controlsVisible = true;
  clearTimeout(hideTimeout);
  if (isRunning) {
    hideTimeout = setTimeout(() => {
      controls.classList.add('hidden');
      zoomHint?.classList.add('hidden');
      controlsVisible = false;
    }, 5000);
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
    console.error('Failed:', error);
    hint.textContent = error.message || 'Failed';
    hint.style.color = '#ff6b6b';
  }
}

systemAudioBtn?.addEventListener('click', () => startWithSource(() => audio.initSystemAudio()));
micBtn?.addEventListener('click', () => startWithSource(() => audio.initMicrophone()));

function animate() {
  if (!isRunning || !visualizer) return;
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

document.addEventListener('mousemove', showControls);
document.addEventListener('touchstart', showControls);

canvas?.addEventListener('dblclick', () => {
  document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
});

const TOTAL_MODES = 12;

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  
  if (e.key >= '1' && e.key <= '9') { visualizer?.setMode(parseInt(e.key) - 1); return; }
  if (e.key === '0') { visualizer?.setMode(9); return; }
  
  switch (e.key.toLowerCase()) {
    case 'f': document.documentElement.requestFullscreen(); break;
    case 'escape': document.fullscreenElement && document.exitFullscreen(); break;
    case 'h': controlsVisible ? (controls.classList.add('hidden'), zoomHint?.classList.add('hidden'), controlsVisible = false) : showControls(); break;
    case 'arrowright': visualizer?.setMode((visualizer.currentModeIndex + 1) % TOTAL_MODES); break;
    case 'arrowleft': visualizer?.setMode((visualizer.currentModeIndex + TOTAL_MODES - 1) % TOTAL_MODES); break;
    case 'k': visualizer?.setMode(10); break; // Kaleidoscope
    case 'l': visualizer?.setMode(11); break; // Fluid
  }
});

document.addEventListener('contextmenu', (e) => e.preventDefault());

function staticRender() {
  if (isRunning || !visualizer) return;
  requestAnimationFrame(staticRender);
  visualizer.update({ waveform: new Uint8Array(512).fill(128), frequencies: new Uint8Array(512).fill(0), volume: 0, bass: 0, mids: 0, highs: 0 });
}

if (visualizer) {
  staticRender();
  visualizer.setMode(0);
  applySettings(currentSettings);
}
