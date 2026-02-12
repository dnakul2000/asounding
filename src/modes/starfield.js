import * as THREE from 'three';

export class StarfieldMode {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
    this.init();
  }

  init() {
    const starCount = 2000;
    const geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(starCount * 3);
    this.velocities = new Float32Array(starCount);
    this.colors = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount; i++) {
      this.resetStar(i);
      // Start with spread distribution
      this.positions[i * 3 + 2] = -Math.random() * 50;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    
    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
    this.objects.push(this.stars);
    
    // Nebula clouds (large transparent spheres)
    this.nebulae = [];
    for (let i = 0; i < 5; i++) {
      const geo = new THREE.SphereGeometry(3 + Math.random() * 5, 16, 16);
      const mat = new THREE.MeshBasicMaterial({
        color: Math.random() * 0xffffff,
        transparent: true,
        opacity: 0.05,
        side: THREE.BackSide
      });
      const nebula = new THREE.Mesh(geo, mat);
      nebula.position.set(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        -20 - Math.random() * 30
      );
      this.scene.add(nebula);
      this.nebulae.push(nebula);
      this.objects.push(nebula);
    }
    
    // Distant sun
    const sunGeo = new THREE.SphereGeometry(2, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.8
    });
    this.sun = new THREE.Mesh(sunGeo, sunMat);
    this.sun.position.set(10, 5, -40);
    this.scene.add(this.sun);
    this.objects.push(this.sun);
  }

  resetStar(i) {
    // Spawn at distance, random xy
    this.positions[i * 3] = (Math.random() - 0.5) * 30;
    this.positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
    this.positions[i * 3 + 2] = -50;
    this.velocities[i] = 0.1 + Math.random() * 0.2;
    
    // Random color (white to blue to purple)
    const hue = 0.5 + Math.random() * 0.3;
    const sat = Math.random() * 0.5;
    const rgb = this.hslToRgb(hue, sat, 0.8);
    this.colors[i * 3] = rgb.r;
    this.colors[i * 3 + 1] = rgb.g;
    this.colors[i * 3 + 2] = rgb.b;
  }

  hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return { r, g, b };
  }

  update(audioData) {
    const { bass, volume, mids, highs } = audioData;
    
    // Speed based on bass
    const speedMultiplier = 1 + bass * 5;
    
    const positions = this.stars.geometry.attributes.position.array;
    const colors = this.stars.geometry.attributes.color.array;
    const starCount = positions.length / 3;
    
    for (let i = 0; i < starCount; i++) {
      // Move toward camera
      positions[i * 3 + 2] += this.velocities[i] * speedMultiplier;
      
      // Stretch effect at high speed
      const stretch = 1 + bass * 2;
      
      // Reset if past camera
      if (positions[i * 3 + 2] > 5) {
        this.resetStar(i);
      }
      
      // Brighten based on proximity and bass
      const z = positions[i * 3 + 2];
      const brightness = Math.max(0, 1 - Math.abs(z) / 50);
      const boost = bass > 0.5 ? 1.5 : 1;
      colors[i * 3] = Math.min(1, colors[i * 3] * brightness * boost);
      colors[i * 3 + 1] = Math.min(1, colors[i * 3 + 1] * brightness * boost);
      colors[i * 3 + 2] = Math.min(1, colors[i * 3 + 2] * brightness * boost);
    }
    
    this.stars.geometry.attributes.position.needsUpdate = true;
    this.stars.geometry.attributes.color.needsUpdate = true;
    
    // Star size based on speed
    this.stars.material.size = 0.08 + bass * 0.15;
    
    // Move nebulae
    this.nebulae.forEach((nebula, i) => {
      nebula.position.z += 0.05 * speedMultiplier;
      if (nebula.position.z > 10) {
        nebula.position.z = -50;
        nebula.position.x = (Math.random() - 0.5) * 20;
        nebula.position.y = (Math.random() - 0.5) * 20;
      }
      nebula.material.opacity = 0.03 + volume * 0.05;
      
      // Color shift
      const hue = (Date.now() * 0.00005 + i * 0.2) % 1;
      nebula.material.color.setHSL(hue, 0.8, 0.5);
    });
    
    // Pulse sun
    const sunScale = 1 + mids * 0.5;
    this.sun.scale.set(sunScale, sunScale, sunScale);
    this.sun.material.opacity = 0.6 + volume * 0.4;
    
    return { shake: bass * 0.02, bloomBoost: volume * 2 };
  }

  dispose() {
    this.objects.forEach(obj => {
      this.scene.remove(obj);
      obj.geometry.dispose();
      obj.material.dispose();
    });
  }
}
