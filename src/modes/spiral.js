import * as THREE from 'three';

export class SpiralMode {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
    this.sensitivity = 2.0;
    this.time = 0;
    this.init();
  }

  setSensitivity(val) { this.sensitivity = val; }

  init() {
    const segments = 500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(segments * 3);
    const colors = new Float32Array(segments * 3);
    this.basePositions = new Float32Array(segments * 3);
    
    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      const angle = t * Math.PI * 8;
      const radius = 0.5 + t * 3;
      this.basePositions[i * 3] = Math.cos(angle) * radius;
      this.basePositions[i * 3 + 1] = (t - 0.5) * 6;
      this.basePositions[i * 3 + 2] = Math.sin(angle) * radius;
      positions[i * 3] = this.basePositions[i * 3];
      positions[i * 3 + 1] = this.basePositions[i * 3 + 1];
      positions[i * 3 + 2] = this.basePositions[i * 3 + 2];
      colors[i * 3] = t; colors[i * 3 + 1] = 1 - t; colors[i * 3 + 2] = 1;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    this.spiral = new THREE.Line(geometry, new THREE.LineBasicMaterial({ vertexColors: true }));
    this.scene.add(this.spiral);
    this.objects.push(this.spiral);
    
    this.spiral2 = new THREE.Line(geometry.clone(), new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5 }));
    this.spiral2.rotation.y = Math.PI;
    this.scene.add(this.spiral2);
    this.objects.push(this.spiral2);
    
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(200 * 3);
    for (let i = 0; i < 200; i++) { pPos[i * 3] = (Math.random() - 0.5) * 0.5; pPos[i * 3 + 1] = (Math.random() - 0.5) * 8; pPos[i * 3 + 2] = (Math.random() - 0.5) * 0.5; }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    this.coreParticles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, blending: THREE.AdditiveBlending }));
    this.scene.add(this.coreParticles);
    this.objects.push(this.coreParticles);
  }

  hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) { r = g = b = l; } else {
      const hue2rgb = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1/6) return p + (q - p) * 6 * t; if (t < 1/2) return q; if (t < 2/3) return p + (q - p) * (2/3 - t) * 6; return p; };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s; const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1/3);
    }
    return { r, g, b };
  }

  update(audioData) {
    const { waveform, bass, volume, animSpeed = 1 } = audioData;
    if (!waveform) return;
    
    // Animation speed affects spiral rotation
    this.time += (0.02 + bass * 0.05) * animSpeed;
    const positions = this.spiral.geometry.attributes.position.array;
    const colors = this.spiral.geometry.attributes.color.array;
    const segments = positions.length / 3;
    const step = Math.floor(waveform.length / segments);
    
    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      const waveVal = ((waveform[i * step] || 128) / 128 - 1) * this.sensitivity;
      const angle = t * Math.PI * 8 + this.time;
      const baseRadius = 0.5 + t * 3;
      const radius = baseRadius + waveVal * (1 + bass * 2);
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (t - 0.5) * 6 + waveVal * 0.5;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      
      const hue = (t + this.time * 0.1) % 1;
      const rgb = this.hslToRgb(hue, 1, 0.5);
      colors[i * 3] = rgb.r; colors[i * 3 + 1] = rgb.g; colors[i * 3 + 2] = rgb.b;
    }
    
    this.spiral.geometry.attributes.position.needsUpdate = true;
    this.spiral.geometry.attributes.color.needsUpdate = true;
    this.spiral2.geometry.attributes.position.array.set(positions);
    this.spiral2.geometry.attributes.position.needsUpdate = true;
    this.spiral.rotation.y = this.time * 0.3;
    this.spiral2.rotation.y = Math.PI + this.time * 0.5;
    
    const pPos = this.coreParticles.geometry.attributes.position.array;
    for (let i = 0; i < pPos.length / 3; i++) { pPos[i * 3 + 1] += 0.05 + bass * 0.2; if (pPos[i * 3 + 1] > 4) pPos[i * 3 + 1] = -4; }
    this.coreParticles.geometry.attributes.position.needsUpdate = true;
    this.coreParticles.material.opacity = 0.5 + volume * 0.5;
    
    return { shake: bass * 0.1, bloomBoost: volume * 1.5, color: '#ff6600' };
  }

  dispose() {
    this.objects.forEach(obj => { this.scene.remove(obj); obj.geometry.dispose(); obj.material.dispose(); });
  }
}
