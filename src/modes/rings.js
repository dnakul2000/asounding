import * as THREE from 'three';

export class RingsMode {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
    this.init();
  }

  init() {
    this.rings = [];
    const ringCount = 8;
    
    // Each ring represents a frequency band
    for (let i = 0; i < ringCount; i++) {
      const innerRadius = 0.5 + i * 0.4;
      const outerRadius = innerRadius + 0.3;
      
      const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);
      const material = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
      });
      
      const ring = new THREE.Mesh(geometry, material);
      ring.userData.baseInner = innerRadius;
      ring.userData.baseOuter = outerRadius;
      ring.userData.bandIndex = i;
      
      this.scene.add(ring);
      this.rings.push(ring);
      this.objects.push(ring);
    }
    
    // Center dot
    const dotGeo = new THREE.CircleGeometry(0.3, 32);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.centerDot = new THREE.Mesh(dotGeo, dotMat);
    this.scene.add(this.centerDot);
    this.objects.push(this.centerDot);
    
    // Outer glow particles
    const particleCount = 400;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    this.particleData = [];
    
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 4 + Math.random() * 3;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
      this.particleData.push({ angle, radius, speed: Math.random() * 0.02 + 0.01 });
    }
    
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({
      color: 0x00ffff,
      size: 0.05,
      transparent: true,
      blending: THREE.AdditiveBlending
    }));
    this.scene.add(this.particles);
    this.objects.push(this.particles);
  }

  update(audioData) {
    const { frequencies, bass, volume, mids, highs } = audioData;
    if (!frequencies) return;
    
    const bandSize = Math.floor(frequencies.length / this.rings.length);
    
    this.rings.forEach((ring, i) => {
      // Get average for this frequency band
      let sum = 0;
      for (let j = 0; j < bandSize; j++) {
        sum += frequencies[i * bandSize + j];
      }
      const bandValue = sum / bandSize / 255;
      
      // Scale ring based on frequency
      const scale = 1 + bandValue * 1.5;
      ring.scale.set(scale, scale, 1);
      
      // Rotate each ring differently
      ring.rotation.z += (0.005 + bandValue * 0.02) * (i % 2 === 0 ? 1 : -1);
      
      // Color based on frequency band (low = red, high = blue)
      const hue = i / this.rings.length * 0.7;
      const lightness = 0.4 + bandValue * 0.3;
      ring.material.color.setHSL(hue, 1, lightness);
      ring.material.opacity = 0.4 + bandValue * 0.5;
    });
    
    // Pulse center
    const centerScale = 0.3 + bass * 1.5;
    this.centerDot.scale.set(centerScale, centerScale, 1);
    
    // Animate particles
    const positions = this.particles.geometry.attributes.position.array;
    for (let i = 0; i < this.particleData.length; i++) {
      const p = this.particleData[i];
      p.angle += p.speed + bass * 0.05;
      const r = p.radius + Math.sin(Date.now() * 0.001 + i) * 0.5;
      positions[i * 3] = Math.cos(p.angle) * r;
      positions[i * 3 + 1] = Math.sin(p.angle) * r;
    }
    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.material.opacity = 0.3 + volume * 0.5;
    
    // Color particles based on highs
    const pHue = (Date.now() * 0.0001) % 1;
    this.particles.material.color.setHSL(pHue, 1, 0.5);
    
    return { shake: bass * 0.08, bloomBoost: volume * 1.5 };
  }

  dispose() {
    this.objects.forEach(obj => {
      this.scene.remove(obj);
      obj.geometry.dispose();
      obj.material.dispose();
    });
  }
}
