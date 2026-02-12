import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

export class TextOverlay {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.targetScale = 1;
    this.currentScale = 1;
    this.targetRotation = { x: 0, y: 0, z: 0 };
    this.baseColor = new THREE.Color(0xffffff);
    this.glowIntensity = 0;
    
    this.createText();
  }

  createText() {
    // Create text using canvas texture for reliability (no font loading issues)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1024;
    canvas.height = 256;
    
    // Draw text
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.font = 'bold 180px Arial Black, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('NAKUL', canvas.width / 2, canvas.height / 2);
    
    // Create texture
    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.needsUpdate = true;
    
    // Create mesh
    const geometry = new THREE.PlaneGeometry(6, 1.5);
    this.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.z = 1;
    this.scene.add(this.mesh);
    
    // Glow layer
    const glowGeo = new THREE.PlaneGeometry(7, 2);
    this.glowMaterial = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    this.glowMesh = new THREE.Mesh(glowGeo, this.glowMaterial);
    this.glowMesh.position.z = 0.9;
    this.scene.add(this.glowMesh);
  }

  setColor(color) {
    this.baseColor.set(color);
    this.updateTextColor();
  }

  updateTextColor() {
    // Redraw canvas with new color
    const canvas = this.texture.image;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.font = 'bold 180px Arial Black, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgb(${Math.floor(this.baseColor.r * 255)}, ${Math.floor(this.baseColor.g * 255)}, ${Math.floor(this.baseColor.b * 255)})`;
    ctx.fillText('NAKUL', canvas.width / 2, canvas.height / 2);
    
    this.texture.needsUpdate = true;
  }

  update(audioData, modeColor = null) {
    if (!this.mesh) return;
    
    const { bass, volume, mids, highs } = audioData;
    
    // Scale with bass
    this.targetScale = 1 + bass * 0.5;
    this.currentScale += (this.targetScale - this.currentScale) * 0.2;
    this.mesh.scale.set(this.currentScale, this.currentScale, 1);
    this.glowMesh.scale.set(this.currentScale * 1.2, this.currentScale * 1.2, 1);
    
    // Shake with bass hits
    if (bass > 0.5) {
      this.mesh.position.x = (Math.random() - 0.5) * bass * 0.3;
      this.mesh.position.y = (Math.random() - 0.5) * bass * 0.3;
    } else {
      this.mesh.position.x *= 0.9;
      this.mesh.position.y *= 0.9;
    }
    this.glowMesh.position.x = this.mesh.position.x;
    this.glowMesh.position.y = this.mesh.position.y;
    
    // Subtle rotation with mids
    this.mesh.rotation.z = Math.sin(Date.now() * 0.001) * 0.02 + mids * 0.1;
    this.glowMesh.rotation.z = this.mesh.rotation.z;
    
    // Opacity pulse
    this.material.opacity = 0.7 + volume * 0.3;
    this.glowMaterial.opacity = 0.2 + bass * 0.4;
    
    // Color from mode
    if (modeColor) {
      this.baseColor.set(modeColor);
      this.updateTextColor();
    }
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
