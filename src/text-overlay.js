import * as THREE from 'three';

export class TextOverlay {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.currentScale = 0.4;
    this.baseColor = new THREE.Color(0xffffff);
    this.time = 0;
    this.modeIndex = 0;
    
    this.createText();
  }

  createText() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 90px Arial Black, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('NAKUL', canvas.width / 2, canvas.height / 2);
    
    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.needsUpdate = true;
    
    // Smaller base size
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
    
    // Glow layer
    const glowGeo = new THREE.PlaneGeometry(3, 0.8);
    this.glowMaterial = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    this.glowMesh = new THREE.Mesh(glowGeo, this.glowMaterial);
    this.glowMesh.position.z = 0.9;
    this.scene.add(this.glowMesh);
  }

  setMode(index) {
    this.modeIndex = index;
  }

  setColor(color) {
    this.baseColor.set(color);
    this.updateTextColor();
  }

  updateTextColor() {
    const canvas = this.texture.image;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 90px Arial Black, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgb(${Math.floor(this.baseColor.r * 255)}, ${Math.floor(this.baseColor.g * 255)}, ${Math.floor(this.baseColor.b * 255)})`;
    ctx.fillText('NAKUL', canvas.width / 2, canvas.height / 2);
    
    this.texture.needsUpdate = true;
  }

  update(audioData, modeColor = null) {
    if (!this.mesh) return;
    
    const { bass, volume, mids, highs } = audioData;
    this.time += 0.016;
    
    if (modeColor) {
      this.baseColor.set(modeColor);
      this.updateTextColor();
    }
    
    // Base reactive behavior
    const bassScale = 0.4 + bass * 0.4;
    const targetScale = bassScale + volume * 0.15;
    this.currentScale += (targetScale - this.currentScale) * 0.3;
    
    // Mode-specific animations
    switch (this.modeIndex) {
      case 0: // Waveform - horizontal shake
        this.mesh.position.x = Math.sin(this.time * 10) * bass * 0.3;
        this.mesh.position.y = 0;
        this.mesh.rotation.z = Math.sin(this.time * 8) * bass * 0.1;
        break;
        
      case 1: // Circular - spin
        this.mesh.rotation.z += 0.02 + bass * 0.1;
        this.mesh.position.x = 0;
        this.mesh.position.y = 0;
        break;
        
      case 2: // Bars - bounce up/down
        this.mesh.position.x = 0;
        this.mesh.position.y = Math.abs(Math.sin(this.time * 6)) * bass * 0.8 - 0.2;
        this.mesh.rotation.z = 0;
        break;
        
      case 3: // Particles - orbit
        this.mesh.position.x = Math.cos(this.time * 2) * 0.5;
        this.mesh.position.y = Math.sin(this.time * 2) * 0.3;
        this.mesh.rotation.z = Math.sin(this.time) * 0.1;
        break;
        
      case 4: // Tunnel - zoom pulse
        this.mesh.position.x = 0;
        this.mesh.position.y = 0;
        this.mesh.position.z = 1 + bass * 2;
        this.mesh.rotation.z = this.time * 0.5;
        break;
        
      case 5: // Sphere - float
        this.mesh.position.x = Math.sin(this.time * 1.5) * 0.3;
        this.mesh.position.y = Math.cos(this.time * 1.2) * 0.2 + Math.sin(this.time * 3) * bass * 0.2;
        this.mesh.rotation.z = Math.sin(this.time * 0.5) * 0.15;
        break;
        
      case 6: // Spiral - twist
        this.mesh.position.x = 0;
        this.mesh.position.y = Math.sin(this.time * 2) * 0.5;
        this.mesh.rotation.z = this.time + bass * Math.PI;
        break;
        
      case 7: // Grid - wave
        this.mesh.position.x = Math.sin(this.time * 3) * 0.2;
        this.mesh.position.y = 1.5 + Math.sin(this.time * 2) * 0.3;
        this.mesh.rotation.z = Math.sin(this.time) * 0.05;
        break;
        
      case 8: // Rings - pulse in place
        this.mesh.position.x = 0;
        this.mesh.position.y = 0;
        this.mesh.rotation.z = 0;
        this.currentScale = 0.4 + bass * 0.6 + Math.sin(this.time * 4) * 0.05;
        break;
        
      case 9: // Starfield - fly toward camera
        this.mesh.position.x = (Math.random() - 0.5) * bass * 0.1;
        this.mesh.position.y = (Math.random() - 0.5) * bass * 0.1;
        this.mesh.position.z = 1 + Math.sin(this.time) * bass;
        this.mesh.rotation.z = 0;
        break;
    }
    
    // Apply scale
    this.mesh.scale.set(this.currentScale, this.currentScale, 1);
    this.glowMesh.scale.set(this.currentScale * 1.3, this.currentScale * 1.3, 1);
    
    // Sync glow position
    this.glowMesh.position.x = this.mesh.position.x;
    this.glowMesh.position.y = this.mesh.position.y;
    this.glowMesh.position.z = this.mesh.position.z - 0.1;
    this.glowMesh.rotation.z = this.mesh.rotation.z;
    
    // Opacity
    this.material.opacity = 0.6 + volume * 0.4;
    this.glowMaterial.opacity = 0.15 + bass * 0.35;
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
    if (this.texture) {
      this.texture.dispose();
    }
  }
}
