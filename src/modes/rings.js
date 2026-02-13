import * as THREE from 'three';

export class RingsMode {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
    this.sensitivity = 2.0;
    this.init();
  }

  setSensitivity(val) { this.sensitivity = val; }

  init() {
    this.rings = [];
    for (let i = 0; i < 8; i++) {
      const innerRadius = 0.5 + i * 0.4;
      const geometry = new THREE.RingGeometry(innerRadius, innerRadius + 0.3, 64);
      const ring = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }));
      ring.userData.bandIndex = i;
      this.scene.add(ring);
      this.rings.push(ring);
      this.objects.push(ring);
    }
    
    this.centerDot = new THREE.Mesh(new THREE.CircleGeometry(0.3, 32), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.scene.add(this.centerDot);
    this.objects.push(this.centerDot);
    
    const pGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(400 * 3);
    this.particleData = [];
    for (let i = 0; i < 400; i++) {
      const angle = Math.random() * Math.PI * 2, radius = 4 + Math.random() * 3;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
      this.particleData.push({ angle, radius, speed: Math.random() * 0.02 + 0.01 });
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0x00ffff, size: 0.05, transparent: true, blending: THREE.AdditiveBlending }));
    this.scene.add(this.particles);
    this.objects.push(this.particles);
  }

  update(audioData) {
    const { frequencies, bass, volume, animSpeed = 1 } = audioData;
    if (!frequencies) return;
    
    // Animation speed affects rotation
    const rotSpeed = animSpeed;
    
    const bandSize = Math.floor(frequencies.length / this.rings.length);
    this.rings.forEach((ring, i) => {
      let sum = 0;
      for (let j = 0; j < bandSize; j++) sum += frequencies[i * bandSize + j];
      const bandValue = (sum / bandSize / 255) * this.sensitivity;
      const scale = 1 + bandValue * 1.5;
      ring.scale.set(scale, scale, 1);
      ring.rotation.z += (0.005 + bandValue * 0.02) * (i % 2 === 0 ? 1 : -1) * rotSpeed;
      const hue = i / this.rings.length * 0.7;
      ring.material.color.setHSL(hue, 1, 0.4 + bandValue * 0.3);
      ring.material.opacity = 0.4 + bandValue * 0.5;
    });
    
    const centerScale = 0.3 + bass * 1.5;
    this.centerDot.scale.set(centerScale, centerScale, 1);
    
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
    this.particles.material.color.setHSL((Date.now() * 0.0001) % 1, 1, 0.5);
    
    return { shake: bass * 0.08, bloomBoost: volume * 1.5, color: '#ff0066' };
  }

  dispose() {
    this.objects.forEach(obj => { this.scene.remove(obj); obj.geometry.dispose(); obj.material.dispose(); });
  }
}
