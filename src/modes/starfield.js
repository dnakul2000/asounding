import * as THREE from 'three';

export class StarfieldMode {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
    this.sensitivity = 2.0;
    this.init();
  }

  setSensitivity(val) { this.sensitivity = val; }

  hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) { r = g = b = l; } else {
      const hue2rgb = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1/6) return p + (q - p) * 6 * t; if (t < 1/2) return q; if (t < 2/3) return p + (q - p) * (2/3 - t) * 6; return p; };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s; const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1/3);
    }
    return { r, g, b };
  }

  init() {
    const starCount = 2000;
    const geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(starCount * 3);
    this.velocities = new Float32Array(starCount);
    this.colors = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount; i++) this.resetStar(i, true);
    
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    
    this.stars = new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.1, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
    this.scene.add(this.stars);
    this.objects.push(this.stars);
    
    this.nebulae = [];
    for (let i = 0; i < 5; i++) {
      const nebula = new THREE.Mesh(new THREE.SphereGeometry(3 + Math.random() * 5, 16, 16), new THREE.MeshBasicMaterial({ color: Math.random() * 0xffffff, transparent: true, opacity: 0.05, side: THREE.BackSide }));
      nebula.position.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, -20 - Math.random() * 30);
      this.scene.add(nebula);
      this.nebulae.push(nebula);
      this.objects.push(nebula);
    }
    
    this.sun = new THREE.Mesh(new THREE.SphereGeometry(2, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 }));
    this.sun.position.set(10, 5, -40);
    this.scene.add(this.sun);
    this.objects.push(this.sun);
  }

  resetStar(i, initial = false) {
    this.positions[i * 3] = (Math.random() - 0.5) * 30;
    this.positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
    this.positions[i * 3 + 2] = initial ? -Math.random() * 50 : -50;
    this.velocities[i] = 0.1 + Math.random() * 0.2;
    const hue = 0.5 + Math.random() * 0.3, sat = Math.random() * 0.5;
    const rgb = this.hslToRgb(hue, sat, 0.8);
    this.colors[i * 3] = rgb.r; this.colors[i * 3 + 1] = rgb.g; this.colors[i * 3 + 2] = rgb.b;
  }

  update(audioData) {
    const { bass, volume, mids, animSpeed = 1, particleDensity = 1 } = audioData;
    // Animation speed affects star movement
    const speedMultiplier = (1 + bass * 5) * this.sensitivity * 0.5 * animSpeed;
    // Particle density affects star size and brightness
    const densityScale = 0.5 + particleDensity * 0.5;
    
    const positions = this.stars.geometry.attributes.position.array;
    const colors = this.stars.geometry.attributes.color.array;
    const starCount = positions.length / 3;
    
    for (let i = 0; i < starCount; i++) {
      positions[i * 3 + 2] += this.velocities[i] * speedMultiplier;
      if (positions[i * 3 + 2] > 5) this.resetStar(i);
      
      const z = positions[i * 3 + 2];
      const brightness = Math.max(0, 1 - Math.abs(z) / 50);
      const boost = bass > 0.5 ? 1.5 : 1;
      colors[i * 3] = Math.min(1, this.colors[i * 3] * brightness * boost);
      colors[i * 3 + 1] = Math.min(1, this.colors[i * 3 + 1] * brightness * boost);
      colors[i * 3 + 2] = Math.min(1, this.colors[i * 3 + 2] * brightness * boost);
    }
    
    this.stars.geometry.attributes.position.needsUpdate = true;
    this.stars.geometry.attributes.color.needsUpdate = true;
    this.stars.material.size = (0.08 + bass * 0.15) * densityScale;
    
    this.nebulae.forEach((nebula, i) => {
      nebula.position.z += 0.05 * speedMultiplier;
      if (nebula.position.z > 10) { nebula.position.z = -50; nebula.position.x = (Math.random() - 0.5) * 20; nebula.position.y = (Math.random() - 0.5) * 20; }
      nebula.material.opacity = 0.03 + volume * 0.05;
      nebula.material.color.setHSL((Date.now() * 0.00005 + i * 0.2) % 1, 0.8, 0.5);
    });
    
    const sunScale = 1 + mids * 0.5;
    this.sun.scale.set(sunScale, sunScale, sunScale);
    this.sun.material.opacity = 0.6 + volume * 0.4;
    
    return { shake: bass * 0.02, bloomBoost: volume * 2, color: '#ffffff' };
  }

  dispose() {
    this.objects.forEach(obj => { this.scene.remove(obj); obj.geometry.dispose(); obj.material.dispose(); });
  }
}
