import * as THREE from 'three';
import { EffectComposer, RenderPass, BloomEffect, EffectPass, ChromaticAberrationEffect, ScanlineEffect, NoiseEffect } from 'postprocessing';

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

const MODE_CLASSES = [
  WaveformMode,   // 1
  CircularMode,   // 2
  BarsMode,       // 3
  ParticlesMode,  // 4
  TunnelMode,     // 5
  SphereMode,     // 6
  SpiralMode,     // 7
  GridMode,       // 8
  RingsMode,      // 9
  StarfieldMode   // 0
];

const MODE_NAMES = [
  'WAVEFORM', 'CIRCULAR', 'BARS', 'PARTICLES', 'TUNNEL',
  'SPHERE', 'SPIRAL', 'GRID', 'RINGS', 'STARFIELD'
];

export class WaveformVisualizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.currentModeIndex = 0;
    this.mode = null;
    this.settings = {
      zoom: 1,
      bloomIntensity: 1.5
    };
    
    this.init();
    this.setMode(0);
  }

  init() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 5;
    this.baseZoom = 5;
    this.targetShake = { x: 0, y: 0, z: 0 };

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Post-processing
    this.setupPostProcessing();

    // Event handlers
    window.addEventListener('resize', () => this.onResize());
    
    // Scroll zoom
    window.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.settings.zoom = Math.max(0.3, Math.min(3, this.settings.zoom + e.deltaY * -0.001));
    }, { passive: false });
  }

  setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    
    this.bloomEffect = new BloomEffect({
      intensity: this.settings.bloomIntensity,
      luminanceThreshold: 0.1,
      luminanceSmoothing: 0.7,
      mipmapBlur: true
    });

    this.chromaticEffect = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(0.002, 0.002)
    });

    this.scanlineEffect = new ScanlineEffect({ density: 1.3 });
    this.noiseEffect = new NoiseEffect({ premultiply: true });
    this.noiseEffect.blendMode.opacity.value = 0.1;

    this.composer.addPass(new EffectPass(this.camera, this.bloomEffect, this.chromaticEffect));
    this.composer.addPass(new EffectPass(this.camera, this.scanlineEffect, this.noiseEffect));
  }

  setMode(index) {
    // Dispose current mode
    if (this.mode) {
      this.mode.dispose();
    }
    
    this.currentModeIndex = index;
    const ModeClass = MODE_CLASSES[index];
    this.mode = new ModeClass(this.scene);
    
    // Show mode name briefly
    this.showModeName(MODE_NAMES[index]);
    
    return MODE_NAMES[index];
  }

  showModeName(name) {
    // Dispatch event for UI to show
    window.dispatchEvent(new CustomEvent('modechange', { detail: { name } }));
  }

  getModeName() {
    return MODE_NAMES[this.currentModeIndex];
  }

  update(audioData) {
    if (!this.mode) return;
    
    const result = this.mode.update(audioData) || {};
    const { shake = 0, bloomBoost = 0 } = result;
    
    // Camera
    const targetZ = this.baseZoom / this.settings.zoom;
    this.camera.position.z += (targetZ - this.camera.position.z) * 0.1;
    
    // Apply shake
    this.targetShake.x = (Math.random() - 0.5) * shake;
    this.targetShake.y = (Math.random() - 0.5) * shake;
    this.camera.position.x += (this.targetShake.x - this.camera.position.x) * 0.3;
    this.camera.position.y += (this.targetShake.y - this.camera.position.y) * 0.3;
    
    // Chromatic aberration
    const bass = audioData.bass || 0;
    const aberration = 0.001 + bass * 0.008;
    this.chromaticEffect.offset.set(aberration, aberration);
    
    // Bloom
    this.bloomEffect.intensity = this.settings.bloomIntensity + bloomBoost;
    
    // Render
    this.composer.render();
  }

  updateSettings(newSettings) {
    Object.assign(this.settings, newSettings);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  dispose() {
    if (this.mode) this.mode.dispose();
    this.composer.dispose();
    this.renderer.dispose();
  }
}
