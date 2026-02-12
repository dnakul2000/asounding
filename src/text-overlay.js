import * as THREE from 'three';

// Font styles per mode
const MODE_FONTS = [
  { font: 'bold 80px "Arial Black"', style: 'aggressive' },      // Waveform
  { font: 'bold 80px "Helvetica Neue", sans-serif', style: 'clean' }, // Circular
  { font: 'bold 80px "Impact", sans-serif', style: 'bold' },     // Bars
  { font: '80px "Orbitron", "Arial Black", sans-serif', style: 'tech' }, // Particles
  { font: 'bold italic 80px "Arial"', style: 'speed' },          // Tunnel
  { font: '80px "Helvetica Neue", sans-serif', style: 'minimal' }, // Sphere
  { font: 'bold 80px "Georgia", serif', style: 'elegant' },      // Spiral
  { font: '80px "Courier New", monospace', style: 'retro' },     // Grid
  { font: 'bold 80px "Trebuchet MS", sans-serif', style: 'modern' }, // Rings
  { font: '300 80px "Helvetica Neue", sans-serif', style: 'light' }  // Starfield
];

const FONT_OPTIONS = [
  { name: 'Auto', value: 'auto' },
  { name: 'Bold', value: 'bold 80px "Arial Black", sans-serif' },
  { name: 'Clean', value: '80px "Helvetica Neue", sans-serif' },
  { name: 'Elegant', value: 'bold 80px "Georgia", serif' },
  { name: 'Retro', value: '80px "Courier New", monospace' },
  { name: 'Light', value: '300 80px "Helvetica Neue", sans-serif' },
  { name: 'Impact', value: 'bold 80px "Impact", sans-serif' }
];

export { FONT_OPTIONS };

export class TextOverlay {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.currentScale = 0.4;
    this.baseColor = new THREE.Color(0xffffff);
    this.time = 0;
    this.modeIndex = 0;
    this.text = 'NAKUL';
    this.customFont = 'auto';
    this.intensity = 0.5;
    this.onBeat = false;
    
    this.createText();
  }

  createText() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;
    this.canvas = canvas;
    this.ctx = ctx;
    
    this.drawText();
    
    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.needsUpdate = true;
    
    const geometry = new THREE.PlaneGeometry(2.5, 0.6);
    this.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.z = 1;
    this.scene.add(this.mesh);
    
    const glowGeo = new THREE.PlaneGeometry(3, 0.8);
    this.glowMaterial = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    this.glowMesh = new THREE.Mesh(glowGeo, this.glowMaterial);
    this.glowMesh.position.z = 0.9;
    this.scene.add(this.glowMesh);
  }

  getFont() {
    if (this.customFont !== 'auto') {
      return this.customFont;
    }
    return MODE_FONTS[this.modeIndex]?.font || 'bold 80px Arial';
  }

  drawText() {
    const ctx = this.ctx;
    const canvas = this.canvas;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Subtle shadow for depth
    ctx.shadowColor = `rgba(${Math.floor(this.baseColor.r * 255)}, ${Math.floor(this.baseColor.g * 255)}, ${Math.floor(this.baseColor.b * 255)}, 0.5)`;
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    ctx.font = this.getFont();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgb(${Math.floor(this.baseColor.r * 255)}, ${Math.floor(this.baseColor.g * 255)}, ${Math.floor(this.baseColor.b * 255)})`;
    ctx.fillText(this.text, canvas.width / 2, canvas.height / 2);
    
    ctx.shadowBlur = 0;
    
    if (this.texture) {
      this.texture.needsUpdate = true;
    }
  }

  setText(newText) {
    this.text = newText || 'NAKUL';
    this.drawText();
  }

  setFont(fontValue) {
    this.customFont = fontValue;
    this.drawText();
  }

  setMode(index) {
    this.modeIndex = index;
    if (this.customFont === 'auto') {
      this.drawText();
    }
  }

  setColor(color) {
    this.baseColor.set(color);
    this.drawText();
  }

  update(audioData, modeColor = null) {
    if (!this.mesh) return;
    
    const { bass, volume, mids, intensity = 0.5, onBeat = false, energyState = 'normal' } = audioData;
    this.time += 0.016;
    this.intensity = intensity;
    this.onBeat = onBeat;
    
    if (modeColor) {
      this.baseColor.set(modeColor);
      this.drawText();
    }
    
    // Scale based on intensity (smarter now)
    let baseScale = 0.35 + intensity * 0.25;
    if (onBeat) baseScale += 0.1;
    if (energyState === 'peak') baseScale *= 1.15;
    if (energyState === 'calm') baseScale *= 0.85;
    
    const targetScale = baseScale + bass * 0.2;
    this.currentScale += (targetScale - this.currentScale) * 0.25;
    
    // Mode-specific animations (toned down for cleaner look)
    const animIntensity = intensity * 0.5; // Less aggressive
    
    switch (this.modeIndex) {
      case 0: // Waveform
        this.mesh.position.x = Math.sin(this.time * 8) * animIntensity * 0.2;
        this.mesh.position.y = 0;
        this.mesh.rotation.z = Math.sin(this.time * 6) * animIntensity * 0.05;
        break;
        
      case 1: // Circular
        this.mesh.rotation.z += 0.01 + bass * 0.05;
        this.mesh.position.x = 0;
        this.mesh.position.y = 0;
        break;
        
      case 2: // Bars
        this.mesh.position.x = 0;
        this.mesh.position.y = Math.abs(Math.sin(this.time * 5)) * animIntensity * 0.4;
        this.mesh.rotation.z = 0;
        break;
        
      case 3: // Particles
        this.mesh.position.x = Math.cos(this.time * 1.5) * 0.3;
        this.mesh.position.y = Math.sin(this.time * 1.5) * 0.2;
        this.mesh.rotation.z = Math.sin(this.time * 0.5) * 0.05;
        break;
        
      case 4: // Tunnel
        this.mesh.position.x = 0;
        this.mesh.position.y = 0;
        this.mesh.position.z = 1 + intensity;
        this.mesh.rotation.z = this.time * 0.3;
        break;
        
      case 5: // Sphere
        this.mesh.position.x = Math.sin(this.time) * 0.2;
        this.mesh.position.y = Math.cos(this.time * 0.8) * 0.15;
        this.mesh.rotation.z = Math.sin(this.time * 0.3) * 0.08;
        break;
        
      case 6: // Spiral
        this.mesh.position.x = 0;
        this.mesh.position.y = Math.sin(this.time) * 0.3;
        this.mesh.rotation.z = this.time * 0.5 + onBeat * Math.PI * 0.1;
        break;
        
      case 7: // Grid
        this.mesh.position.x = Math.sin(this.time * 2) * 0.15;
        this.mesh.position.y = 1.2;
        this.mesh.rotation.z = 0;
        break;
        
      case 8: // Rings
        this.mesh.position.x = 0;
        this.mesh.position.y = 0;
        this.mesh.rotation.z = 0;
        break;
        
      case 9: // Starfield
        this.mesh.position.x = 0;
        this.mesh.position.y = 0;
        this.mesh.position.z = 1 + Math.sin(this.time * 0.5) * 0.3;
        this.mesh.rotation.z = 0;
        break;
    }
    
    // Apply scale
    this.mesh.scale.set(this.currentScale, this.currentScale, 1);
    this.glowMesh.scale.set(this.currentScale * 1.2, this.currentScale * 1.2, 1);
    
    // Sync glow
    this.glowMesh.position.copy(this.mesh.position);
    this.glowMesh.position.z -= 0.1;
    this.glowMesh.rotation.z = this.mesh.rotation.z;
    
    // Opacity based on intensity
    this.material.opacity = 0.5 + intensity * 0.4;
    this.glowMaterial.opacity = 0.1 + intensity * 0.2;
  }

  dispose() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.material.dispose();
    }
    if (this.glowMesh) {
      this.scene.remove(this.glowMesh);
      this.glowMesh.geometry.dispose();
      this.glowMaterial.dispose();
    }
    if (this.texture) this.texture.dispose();
  }
}
