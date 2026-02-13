import * as THREE from 'three';

export class CircularMode {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
    this.sensitivity = 2.0;
    this.init();
  }

  setSensitivity(val) { this.sensitivity = val; }

  init() {
    const segments = 256;
    this.rings = [];
    for (let r = 0; r < 5; r++) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array((segments + 1) * 3);
      const colors = new Float32Array((segments + 1) * 3);
      
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const radius = 2 + r * 0.5;
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = Math.sin(angle) * radius;
        positions[i * 3 + 2] = -r * 0.5;
        colors[i * 3] = 0; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 1;
      }
      
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      
      const ring = new THREE.Line(geometry, new THREE.LineBasicMaterial({ 
        vertexColors: true, transparent: true, opacity: 1 - r * 0.15
      }));
      this.scene.add(ring);
      this.rings.push(ring);
      this.objects.push(ring);
    }
    
    const glowGeo = new THREE.CircleGeometry(0.5, 32);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5 });
    this.centerGlow = new THREE.Mesh(glowGeo, glowMat);
    this.scene.add(this.centerGlow);
    this.objects.push(this.centerGlow);
  }

  update(audioData) {
    const { waveform, bass, volume, mids, animSpeed = 1 } = audioData;
    if (!waveform) return;
    
    // Animation speed affects ring rotation
    const rotSpeed = animSpeed;
    
    this.rings.forEach((ring, rIdx) => {
      const positions = ring.geometry.attributes.position.array;
      const colors = ring.geometry.attributes.color.array;
      const segments = (positions.length / 3) - 1;
      const step = Math.floor(waveform.length / segments);
      const baseRadius = 2 + rIdx * 0.5;
      
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const dataIdx = (i % segments) * step;
        const val = ((waveform[dataIdx] / 128) - 1) * this.sensitivity;
        const radius = baseRadius + val * (1 + bass * 2);
        
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = Math.sin(angle) * radius;
        
        const hue = (i / segments + Date.now() * 0.0001) % 1;
        colors[i * 3] = Math.sin(hue * Math.PI * 2) * 0.5 + 0.5;
        colors[i * 3 + 1] = Math.sin(hue * Math.PI * 2 + 2) * 0.5 + 0.5;
        colors[i * 3 + 2] = Math.sin(hue * Math.PI * 2 + 4) * 0.5 + 0.5;
      }
      
      ring.geometry.attributes.position.needsUpdate = true;
      ring.geometry.attributes.color.needsUpdate = true;
      ring.rotation.z += (0.01 * (rIdx % 2 === 0 ? 1 : -1) + bass * 0.05) * rotSpeed;
    });
    
    const scale = 0.5 + bass * 2;
    this.centerGlow.scale.set(scale, scale, 1);
    this.centerGlow.material.opacity = 0.3 + volume * 0.5;
    
    return { shake: bass * 0.1, bloomBoost: volume * 1.5, color: '#00ffff' };
  }

  dispose() {
    this.objects.forEach(obj => {
      this.scene.remove(obj);
      obj.geometry.dispose();
      obj.material.dispose();
    });
  }
}
