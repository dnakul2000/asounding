import * as THREE from 'three';

export class ParticlesMode {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
    this.sensitivity = 2.0;
    this.init();
  }

  setSensitivity(val) { this.sensitivity = val; }

  init() {
    const count = 5000;
    const geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = Math.random() * 5;
      this.positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      this.positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      this.positions[i * 3 + 2] = r * Math.cos(phi);
      this.velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      this.velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
      this.colors[i * 3] = Math.random();
      this.colors[i * 3 + 1] = Math.random();
      this.colors[i * 3 + 2] = 1;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    
    this.particles = new THREE.Points(geometry, new THREE.PointsMaterial({
      size: 0.08, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending
    }));
    this.scene.add(this.particles);
    this.objects.push(this.particles);
    
    const coreGeo = new THREE.SphereGeometry(0.2, 16, 16);
    this.core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
    this.scene.add(this.core);
    this.objects.push(this.core);
  }

  update(audioData) {
    const { bass, volume, mids, highs } = audioData;
    const positions = this.particles.geometry.attributes.position.array;
    const colors = this.particles.geometry.attributes.color.array;
    const count = positions.length / 3;
    
    for (let i = 0; i < count; i++) {
      const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2];
      const dist = Math.sqrt(x * x + y * y + z * z) || 1;
      const force = (bass - 0.3) * 0.1 * this.sensitivity;
      const nx = x / dist, ny = y / dist, nz = z / dist;
      
      this.velocities[i * 3] += nx * force;
      this.velocities[i * 3 + 1] += ny * force;
      this.velocities[i * 3 + 2] += nz * force;
      this.velocities[i * 3] *= 0.98;
      this.velocities[i * 3 + 1] *= 0.98;
      this.velocities[i * 3 + 2] *= 0.98;
      
      const orbitSpeed = 0.005 + mids * 0.02;
      this.velocities[i * 3] += -y * orbitSpeed * 0.01;
      this.velocities[i * 3 + 1] += x * orbitSpeed * 0.01;
      
      positions[i * 3] += this.velocities[i * 3];
      positions[i * 3 + 1] += this.velocities[i * 3 + 1];
      positions[i * 3 + 2] += this.velocities[i * 3 + 2];
      
      if (dist > 10) { positions[i * 3] *= 0.1; positions[i * 3 + 1] *= 0.1; positions[i * 3 + 2] *= 0.1; }
      
      const speed = Math.sqrt(this.velocities[i * 3] ** 2 + this.velocities[i * 3 + 1] ** 2 + this.velocities[i * 3 + 2] ** 2);
      colors[i * 3] = Math.min(1, speed * 10 + bass);
      colors[i * 3 + 1] = Math.min(1, 0.5 + highs);
      colors[i * 3 + 2] = 1 - bass * 0.5;
    }
    
    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.geometry.attributes.color.needsUpdate = true;
    this.particles.material.size = 0.05 + bass * 0.15;
    
    const coreScale = 0.2 + bass * 1.5;
    this.core.scale.set(coreScale, coreScale, coreScale);
    
    return { shake: bass * 0.2, bloomBoost: volume * 2, color: '#ff00ff' };
  }

  dispose() {
    this.objects.forEach(obj => { this.scene.remove(obj); obj.geometry.dispose(); obj.material.dispose(); });
  }
}
