import * as THREE from 'three';
import { EffectComposer, RenderPass, BloomEffect, EffectPass, ChromaticAberrationEffect, ScanlineEffect, NoiseEffect, VignetteEffect } from 'postprocessing';

import { WaveformMode } from './modes/waveform.js';
import { CircularMode } from './modes/circular.js';
import { BarsMode } from './modes/bars.js';
import { ParticlesMode } from './modes/particles.js';
import { TunnelMode } from './modes/tunnel.js';
import { SphereMode } from './modes/sphere.js';
import { SpiralMode } from './modes/spiral.js';
import { GridMode } from './modes/grid.js';
import { RingsMode } from './modes/rings.js';
import { StarfieldMode } from './modes/starfield.js';
import { KaleidoscopeMode } from './modes/kaleidoscope.js';
import { FluidMode } from './modes/fluid.js';
import { TextOverlay } from './text-overlay.js';
import { SmartAudioAnalyzer } from './audio-analyzer.js';

const MODE_CLASSES = [WaveformMode, CircularMode, BarsMode, ParticlesMode, TunnelMode, SphereMode, SpiralMode, GridMode, RingsMode, StarfieldMode, KaleidoscopeMode, FluidMode];
const MODE_NAMES = ['WAVEFORM', 'CIRCULAR', 'BARS', 'PARTICLES', 'TUNNEL', 'SPHERE', 'SPIRAL', 'GRID', 'RINGS', 'STARFIELD', 'KALEIDOSCOPE', 'FLUID'];

export class WaveformVisualizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.currentModeIndex = 0;
    this.mode = null;
    this.time = 0;
    
    this.settings = {
      zoom: 1, sensitivity: 2, bloomIntensity: 1.5,
      glitch: 0, chromatic: 0.1, scanlines: 0.5, noise: 0.1, vignette: 0,
      shake: 1, beatFlash: false, invert: false, motionBlur: false,
      animSpeed: 1, trailLength: 1, particleDensity: 1, zoomPulse: 0.5,
      sceneRotation: 0, mirrorX: false, mirrorY: false,
      colorPrimary: '#ff0000', colorSecondary: '#00ffff', colorBg: '#000000',
      saturation: 1, temperature: 0, colorCycle: false, cycleSpeed: 1,
      textSize: 1, textOpacity: 0.9, textReactivity: 1, textGlow: 0.5,
      textColor: '#ffffff', textOutline: false, textOutlineColor: '#000000',
      textAnim: 'pulse',
      // Auto-cycle settings
      autoCycle: true,
      autoCycleBeats: 16,  // Switch every N beats (4, 8, 16, 32, 64)
      autoCycleMode: 'smart'  // 'smart', 'random', 'sequential'
    };
    
    // Auto-cycle state
    this.beatCount = 0;
    this.lastBeatState = false;
    this.morphProgress = 0;
    this.morphing = false;
    this.nextModeIndex = null;
    
    // Transition style
    this.transitionStyle = 'fade';
    
    this.smartAnalyzer = new SmartAudioAnalyzer();
    this.init();
    this.setMode(0);
  }

  init() {
    this.scene = new THREE.Scene();
    this.updateBackgroundColor();

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.z = 5;
    this.baseZoom = 5;

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.setupPostProcessing();
    this.textOverlay = new TextOverlay(this.scene, this.camera, this.renderer);

    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.settings.zoom = Math.max(0.3, Math.min(3, this.settings.zoom + e.deltaY * -0.001));
    }, { passive: false });
  }

  setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    
    this.bloomEffect = new BloomEffect({ intensity: this.settings.bloomIntensity, luminanceThreshold: 0.1, mipmapBlur: true });
    this.chromaticEffect = new ChromaticAberrationEffect({ offset: new THREE.Vector2(0.002, 0.002) });
    this.scanlineEffect = new ScanlineEffect({ density: 1.3 });
    this.noiseEffect = new NoiseEffect({ premultiply: true });
    this.noiseEffect.blendMode.opacity.value = 0.1;
    this.vignetteEffect = new VignetteEffect({ darkness: 0.5, offset: 0.3 });

    this.composer.addPass(new EffectPass(this.camera, this.bloomEffect, this.chromaticEffect));
    this.composer.addPass(new EffectPass(this.camera, this.scanlineEffect, this.noiseEffect, this.vignetteEffect));
  }

  updateBackgroundColor() {
    const color = new THREE.Color(this.settings.colorBg || '#000000');
    this.scene.background = color;
  }

  setMode(index, silent = false) {
    if (this.mode) this.mode.dispose();
    this.currentModeIndex = index;
    this.mode = new MODE_CLASSES[index](this.scene);
    if (this.mode.setSensitivity) this.mode.setSensitivity(this.settings.sensitivity);
    if (this.textOverlay) this.textOverlay.setMode(index);
    if (!silent) {
      window.dispatchEvent(new CustomEvent('modechange', { detail: { name: MODE_NAMES[index] } }));
    }
    return MODE_NAMES[index];
  }

  triggerAutoCycle(energyState) {
    let nextIndex;
    
    if (this.settings.autoCycleMode === 'sequential') {
      // Sequential: just go to next mode
      nextIndex = (this.currentModeIndex + 1) % MODE_CLASSES.length;
    } else if (this.settings.autoCycleMode === 'random') {
      // Random: pick any mode except current
      do {
        nextIndex = Math.floor(Math.random() * MODE_CLASSES.length);
      } while (nextIndex === this.currentModeIndex && MODE_CLASSES.length > 1);
    } else {
      // Smart: weight by energy state
      // High energy: prefer particles, starfield, tunnel
      // Low energy: prefer waveform, rings, spiral
      const highEnergyModes = [3, 4, 9]; // particles, tunnel, starfield
      const lowEnergyModes = [0, 1, 6, 8]; // waveform, circular, spiral, rings
      const neutralModes = [2, 5, 7]; // bars, sphere, grid
      
      let pool;
      if (energyState === 'peak') {
        pool = highEnergyModes;
      } else if (energyState === 'calm') {
        pool = lowEnergyModes;
      } else {
        pool = [...neutralModes, ...highEnergyModes.slice(0, 1), ...lowEnergyModes.slice(0, 1)];
      }
      
      // Pick from pool, avoid current
      const filtered = pool.filter(i => i !== this.currentModeIndex);
      nextIndex = filtered.length > 0 
        ? filtered[Math.floor(Math.random() * filtered.length)]
        : (this.currentModeIndex + 1) % MODE_CLASSES.length;
    }
    
    // Start morph transition
    this.nextModeIndex = nextIndex;
    this.morphing = true;
    this.morphProgress = 0;
    
    const overlay = document.getElementById('morph-overlay');
    const style = this.transitionStyle || 'fade';
    
    // Apply transition-specific styling
    if (overlay) {
      overlay.style.transition = '';
      overlay.style.transform = '';
      overlay.style.filter = '';
      
      switch (style) {
        case 'cut':
          // Instant switch, no transition
          this.setMode(nextIndex, true);
          this.morphing = false;
          this.nextModeIndex = null;
          this.lastCycleTime = Date.now();
          return;
          
        case 'wipe':
          overlay.style.transition = 'transform 0.4s ease-in-out';
          overlay.style.transform = 'translateX(-100%)';
          overlay.classList.add('active');
          setTimeout(() => overlay.style.transform = 'translateX(0)', 10);
          break;
          
        case 'zoom':
          overlay.style.transition = 'opacity 0.3s, transform 0.3s';
          overlay.style.transform = 'scale(0.8)';
          overlay.classList.add('active');
          setTimeout(() => overlay.style.transform = 'scale(1.2)', 10);
          break;
          
        case 'glitch':
          overlay.style.transition = 'opacity 0.1s';
          // Rapid flicker effect
          let flickers = 0;
          const flickerInterval = setInterval(() => {
            overlay.classList.toggle('active');
            flickers++;
            if (flickers >= 6) {
              clearInterval(flickerInterval);
              overlay.classList.add('active');
            }
          }, 50);
          break;
          
        case 'fade':
        default:
          overlay.style.transition = 'opacity 0.4s ease-in-out';
          overlay.classList.add('active');
          break;
      }
      
      // Switch mode at peak
      setTimeout(() => {
        this.setMode(nextIndex, true);
        this.morphing = false;
        this.nextModeIndex = null;
        this.lastCycleTime = Date.now();
      }, style === 'glitch' ? 300 : 400);
      
      // Fade back
      setTimeout(() => {
        overlay.classList.remove('active');
        overlay.style.pointerEvents = 'none';
        if (style === 'wipe') overlay.style.transform = 'translateX(-100%)';
        if (style === 'zoom') overlay.style.transform = 'scale(1)';
      }, style === 'glitch' ? 350 : 500);
    } else {
      this.setMode(nextIndex, true);
      this.morphing = false;
      this.nextModeIndex = null;
      this.lastCycleTime = Date.now();
    }
  }

  update(audioData) {
    if (!this.mode) return;
    
    this.time += 0.016 * this.settings.animSpeed;
    const smartData = this.smartAnalyzer.analyze(audioData);
    const { bass = 0, volume = 0, onBeat = false, energyState = 'normal' } = smartData;
    
    // Auto-cycle: count beats and switch modes
    if (this.settings.autoCycle) {
      // Detect beat edge (rising)
      if (onBeat && !this.lastBeatState) {
        this.beatCount++;
        
        // Check if we should switch
        if (this.beatCount >= this.settings.autoCycleBeats) {
          this.beatCount = 0;
          this.triggerAutoCycle(energyState);
        }
      }
      this.lastBeatState = onBeat;
      
      // Fallback: time-based cycle if no beats detected for too long
      if (!this.lastCycleTime) this.lastCycleTime = Date.now();
      const timeSinceCycle = Date.now() - this.lastCycleTime;
      const fallbackMs = (this.settings.autoCycleBeats / 2) * 1000; // ~8 sec for 16 beats at 120bpm
      if (timeSinceCycle > fallbackMs && !this.morphing) {
        this.beatCount = 0;
        this.triggerAutoCycle(energyState);
      }
    }
    
    // Color cycling
    if (this.settings.colorCycle) {
      const hue = (this.time * 0.1 * this.settings.cycleSpeed) % 1;
      const color = new THREE.Color().setHSL(hue, 1, 0.5);
      this.settings.colorPrimary = '#' + color.getHexString();
    }
    
    // Mode update
    const modeData = { ...smartData, sensitivity: this.settings.sensitivity, animSpeed: this.settings.animSpeed };
    const result = this.mode.update(modeData) || {};
    
    // Text overlay
    if (this.textOverlay) {
      this.textOverlay.update({
        ...smartData,
        textSize: this.settings.textSize,
        textOpacity: this.settings.textOpacity,
        textReactivity: this.settings.textReactivity,
        textGlow: this.settings.textGlow,
        textAnim: this.settings.textAnim
      });
    }
    
    // Camera
    const targetZ = this.baseZoom / this.settings.zoom;
    const zoomPulse = bass * this.settings.zoomPulse;
    this.camera.position.z += (targetZ - zoomPulse - this.camera.position.z) * 0.1;
    
    // Shake
    const shakeAmount = bass * this.settings.shake * 0.15;
    this.camera.position.x = (Math.random() - 0.5) * shakeAmount;
    this.camera.position.y = (Math.random() - 0.5) * shakeAmount;
    
    // Scene rotation
    if (this.settings.sceneRotation > 0) {
      this.scene.rotation.z += this.settings.sceneRotation * 0.01;
    }
    
    // Beat flash
    if (this.settings.beatFlash && onBeat && bass > 0.5) {
      this.scene.background = new THREE.Color(0xffffff);
      setTimeout(() => this.updateBackgroundColor(), 50);
    }
    
    // Post-processing updates
    this.bloomEffect.intensity = this.settings.bloomIntensity + volume;
    this.chromaticEffect.offset.set(this.settings.chromatic * 0.01 + bass * 0.005, this.settings.chromatic * 0.01 + bass * 0.005);
    this.scanlineEffect.density = this.settings.scanlines + bass * 0.3;
    this.noiseEffect.blendMode.opacity.value = this.settings.noise;
    this.vignetteEffect.darkness = this.settings.vignette;
    
    // Mirror
    this.scene.scale.x = this.settings.mirrorX ? -1 : 1;
    this.scene.scale.y = this.settings.mirrorY ? -1 : 1;
    
    this.composer.render();
  }

  updateSettings(newSettings) {
    Object.assign(this.settings, newSettings);
    
    if (this.mode?.setSensitivity && newSettings.sensitivity !== undefined) {
      this.mode.setSensitivity(newSettings.sensitivity);
    }
    
    if (newSettings.colorBg !== undefined) {
      this.updateBackgroundColor();
    }
    
    if (newSettings.bloomIntensity !== undefined) {
      this.bloomEffect.intensity = newSettings.bloomIntensity;
    }
    
    // Text settings
    if (this.textOverlay) {
      if (newSettings.text !== undefined) this.textOverlay.setText(newSettings.text);
      if (newSettings.font !== undefined) this.textOverlay.setFont(newSettings.font);
      if (newSettings.textColor !== undefined) this.textOverlay.setColor(newSettings.textColor);
      
      const textSettings = {};
      if (newSettings.textSize !== undefined) textSettings.size = newSettings.textSize;
      if (newSettings.textOpacity !== undefined) textSettings.opacity = newSettings.textOpacity;
      if (newSettings.textReactivity !== undefined) textSettings.reactivity = newSettings.textReactivity;
      if (newSettings.textGlow !== undefined) textSettings.glow = newSettings.textGlow;
      if (newSettings.textOutline !== undefined) textSettings.outline = newSettings.textOutline;
      if (newSettings.textOutlineColor !== undefined) textSettings.outlineColor = newSettings.textOutlineColor;
      if (newSettings.textAnim !== undefined) textSettings.anim = newSettings.textAnim;
      if (Object.keys(textSettings).length > 0) {
        this.textOverlay.updateSettings(textSettings);
      }
    }
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  dispose() {
    if (this.mode) this.mode.dispose();
    if (this.textOverlay) this.textOverlay.dispose();
    this.composer.dispose();
    this.renderer.dispose();
  }
}
