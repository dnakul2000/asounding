import * as THREE from 'three';

const FONTS = [
  { name: 'Bebas Neue', value: 'Bebas Neue' },
  { name: 'Montserrat', value: 'Montserrat' },
  { name: 'Oswald', value: 'Oswald' },
  { name: 'Rajdhani', value: 'Rajdhani' },
  { name: 'Orbitron', value: 'Orbitron' },
  { name: 'Press Start 2P', value: 'Press Start 2P' },
  { name: 'Teko', value: 'Teko' },
  { name: 'Anton', value: 'Anton' },
  { name: 'Black Ops One', value: 'Black Ops One' },
  { name: 'Righteous', value: 'Righteous' }
];

export { FONTS };

export class TextOverlay {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.mesh = null;
    this.currentScale = 1;
    this.baseColor = new THREE.Color(0xffffff);
    this.time = 0;
    this.text = 'NAKUL';
    this.font = 'Bebas Neue';
    this.fontSize = 80;
    this.intensity = 0.5;
    this.onBeat = false;
    
    // Position (normalized -1 to 1)
    this.position = { x: 0, y: 0 };
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    
    // Settings
    this.settings = {
      size: 1,
      opacity: 0.9,
      outline: false,
      outlineColor: '#000000',
      shadow: true,
      reactivity: 1
    };
    
    this.loadFonts();
    this.createText();
    this.setupDrag();
  }

  loadFonts() {
    // Load Google Fonts
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@700;900&family=Oswald:wght@700&family=Rajdhani:wght@700&family=Orbitron:wght@700;900&family=Press+Start+2P&family=Teko:wght@700&family=Anton&family=Black+Ops+One&family=Righteous&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }

  createText() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1024;
    canvas.height = 256;
    this.canvas = canvas;
    this.ctx = ctx;
    
    this.drawText();
    
    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.needsUpdate = true;
    
    const geometry = new THREE.PlaneGeometry(4, 1);
    this.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: this.settings.opacity,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthTest: false
    });
    
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.renderOrder = 999;
    this.mesh.position.z = 2;
    this.scene.add(this.mesh);
    
    // Glow
    const glowGeo = new THREE.PlaneGeometry(4.5, 1.2);
    this.glowMaterial = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthTest: false
    });
    this.glowMesh = new THREE.Mesh(glowGeo, this.glowMaterial);
    this.glowMesh.renderOrder = 998;
    this.glowMesh.position.z = 1.9;
    this.scene.add(this.glowMesh);
  }

  setupDrag() {
    const canvas = this.renderer.domElement;
    
    const getMousePos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      return { x, y };
    };
    
    const isOverText = (mousePos) => {
      const textX = this.position.x;
      const textY = this.position.y;
      const scale = this.currentScale * this.settings.size;
      const halfW = scale * 0.5;
      const halfH = scale * 0.15;
      return Math.abs(mousePos.x - textX) < halfW && Math.abs(mousePos.y - textY) < halfH;
    };
    
    canvas.addEventListener('mousedown', (e) => {
      const pos = getMousePos(e);
      if (isOverText(pos)) {
        this.isDragging = true;
        this.dragOffset.x = pos.x - this.position.x;
        this.dragOffset.y = pos.y - this.position.y;
        canvas.style.cursor = 'grabbing';
        e.preventDefault();
      }
    });
    
    canvas.addEventListener('mousemove', (e) => {
      const pos = getMousePos(e);
      if (this.isDragging) {
        this.position.x = pos.x - this.dragOffset.x;
        this.position.y = pos.y - this.dragOffset.y;
        // Clamp to screen
        this.position.x = Math.max(-1.5, Math.min(1.5, this.position.x));
        this.position.y = Math.max(-1, Math.min(1, this.position.y));
      } else {
        canvas.style.cursor = isOverText(pos) ? 'grab' : 'default';
      }
    });
    
    canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
      canvas.style.cursor = 'default';
    });
    
    canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
    });
  }

  drawText() {
    const ctx = this.ctx;
    const canvas = this.canvas;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const fontSize = this.fontSize * (this.settings.size || 1);
    ctx.font = `900 ${fontSize}px "${this.font}", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Shadow
    if (this.settings.shadow) {
      ctx.shadowColor = `rgba(${Math.floor(this.baseColor.r * 255)}, ${Math.floor(this.baseColor.g * 255)}, ${Math.floor(this.baseColor.b * 255)}, 0.6)`;
      ctx.shadowBlur = 30;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
    
    // Outline
    if (this.settings.outline) {
      ctx.strokeStyle = this.settings.outlineColor;
      ctx.lineWidth = 4;
      ctx.strokeText(this.text, canvas.width / 2, canvas.height / 2);
    }
    
    // Fill
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

  setFont(fontName) {
    this.font = fontName;
    // Wait for font to load
    setTimeout(() => this.drawText(), 100);
  }

  setColor(color) {
    this.baseColor.set(color);
    this.drawText();
  }

  updateSettings(newSettings) {
    Object.assign(this.settings, newSettings);
    this.drawText();
  }

  update(audioData) {
    if (!this.mesh) return;
    
    const { bass = 0, volume = 0, intensity = 0.5, onBeat = false } = audioData;
    this.time += 0.016;
    this.intensity = intensity;
    this.onBeat = onBeat;
    
    const reactivity = this.settings.reactivity || 1;
    
    // Scale reactivity
    let targetScale = this.settings.size || 1;
    targetScale += bass * 0.3 * reactivity;
    if (onBeat) targetScale += 0.15 * reactivity;
    
    this.currentScale += (targetScale - this.currentScale) * 0.2;
    
    // Subtle shake on bass (not position-based)
    const shakeX = (Math.random() - 0.5) * bass * 0.02 * reactivity;
    const shakeY = (Math.random() - 0.5) * bass * 0.02 * reactivity;
    
    // Convert normalized position to world position
    const worldX = this.position.x * 4 + shakeX;
    const worldY = this.position.y * 2.5 + shakeY;
    
    this.mesh.position.x = worldX;
    this.mesh.position.y = worldY;
    this.mesh.scale.set(this.currentScale, this.currentScale, 1);
    
    // Subtle rotation
    this.mesh.rotation.z = Math.sin(this.time * 2) * 0.02 * reactivity * bass;
    
    // Glow follows
    this.glowMesh.position.x = worldX;
    this.glowMesh.position.y = worldY;
    this.glowMesh.scale.set(this.currentScale * 1.15, this.currentScale * 1.15, 1);
    this.glowMesh.rotation.z = this.mesh.rotation.z;
    
    // Opacity
    this.material.opacity = (this.settings.opacity || 0.9) * (0.7 + intensity * 0.3);
    this.glowMaterial.opacity = 0.1 + bass * 0.3;
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
