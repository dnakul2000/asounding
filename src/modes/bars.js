import * as THREE from 'three';

export class BarsMode {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
    this.sensitivity = 2.0;
    this.time = 0;
    this.init();
  }

  setSensitivity(val) { this.sensitivity = val; }

  init() {
    const barCount = 64;
    this.barCount = barCount;
    this.bars = [];
    this.barTargets = new Float32Array(barCount);
    this.barVelocities = new Float32Array(barCount);
    
    // Create bars in semi-circular arrangement for 3D depth
    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount - 0.5) * Math.PI * 0.8; // Arc spread
      const radius = 6;
      
      const geometry = new THREE.BoxGeometry(0.18, 1, 0.18);
      const material = new THREE.MeshBasicMaterial({ 
        color: 0x00ff00, 
        transparent: true, 
        opacity: 0.9 
      });
      const bar = new THREE.Mesh(geometry, material);
      
      bar.position.x = Math.sin(angle) * radius;
      bar.position.z = -Math.cos(angle) * radius + 3;
      bar.position.y = 0;
      bar.rotation.y = angle;
      bar.scale.y = 0.01;
      
      this.scene.add(bar);
      this.bars.push(bar);
      this.objects.push(bar);
    }
    
    // Floor reflection plane
    const floorGeo = new THREE.PlaneGeometry(20, 15);
    this.floor = new THREE.Mesh(floorGeo, new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3
    }));
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -0.01;
    this.scene.add(this.floor);
    this.objects.push(this.floor);
    
    // Reflection bars (mirrored below)
    this.reflections = [];
    for (let i = 0; i < barCount; i++) {
      const bar = this.bars[i];
      const reflection = bar.clone();
      reflection.material = bar.material.clone();
      reflection.material.opacity = 0.3;
      reflection.scale.y = 0.01;
      this.scene.add(reflection);
      this.reflections.push(reflection);
      this.objects.push(reflection);
    }
    
    // Glow particles along the top of bars
    const glowGeo = new THREE.BufferGeometry();
    const glowPos = new Float32Array(barCount * 3);
    const glowColors = new Float32Array(barCount * 3);
    glowGeo.setAttribute('position', new THREE.BufferAttribute(glowPos, 3));
    glowGeo.setAttribute('color', new THREE.BufferAttribute(glowColors, 3));
    this.glowPoints = new THREE.Points(glowGeo, new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    }));
    this.scene.add(this.glowPoints);
    this.objects.push(this.glowPoints);
    
    // Background ambient particles
    const ambientGeo = new THREE.BufferGeometry();
    const ambientPos = new Float32Array(200 * 3);
    for (let i = 0; i < 200; i++) {
      ambientPos[i * 3] = (Math.random() - 0.5) * 20;
      ambientPos[i * 3 + 1] = Math.random() * 8;
      ambientPos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 5;
    }
    ambientGeo.setAttribute('position', new THREE.BufferAttribute(ambientPos, 3));
    this.ambientParticles = new THREE.Points(ambientGeo, new THREE.PointsMaterial({
      size: 0.05,
      color: 0x00ffff,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    }));
    this.scene.add(this.ambientParticles);
    this.objects.push(this.ambientParticles);
  }

  update(audioData) {
    const { frequencies, bass, volume, mids } = audioData;
    if (!frequencies) return;
    
    this.time += 0.016;
    const step = Math.floor(frequencies.length / this.barCount);
    
    const glowPositions = this.glowPoints.geometry.attributes.position.array;
    const glowColors = this.glowPoints.geometry.attributes.color.array;
    
    for (let i = 0; i < this.barCount; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) sum += frequencies[i * step + j];
      const value = (sum / step / 255) * this.sensitivity * 3;
      
      // Physics-based smoothing (spring)
      const target = Math.max(0.01, value);
      const diff = target - this.barTargets[i];
      this.barVelocities[i] += diff * 0.4;
      this.barVelocities[i] *= 0.75; // damping
      this.barTargets[i] += this.barVelocities[i];
      
      const height = this.barTargets[i];
      const bar = this.bars[i];
      
      bar.scale.y = height;
      bar.position.y = height / 2;
      
      // Dynamic color based on frequency band and height
      const hue = (i / this.barCount) * 0.6 + this.time * 0.05;
      const saturation = 0.8 + height * 0.2;
      const lightness = 0.4 + height * 0.15 + bass * 0.1;
      bar.material.color.setHSL(hue % 1, saturation, Math.min(0.7, lightness));
      bar.material.opacity = 0.7 + height * 0.3;
      
      // Reflection
      const reflection = this.reflections[i];
      reflection.position.copy(bar.position);
      reflection.position.y = -height / 2;
      reflection.scale.y = height * 0.6;
      reflection.rotation.y = bar.rotation.y;
      reflection.material.color.copy(bar.material.color);
      reflection.material.opacity = 0.15 + height * 0.1;
      
      // Glow point at top of bar
      glowPositions[i * 3] = bar.position.x;
      glowPositions[i * 3 + 1] = height + 0.1;
      glowPositions[i * 3 + 2] = bar.position.z;
      
      const rgb = bar.material.color;
      glowColors[i * 3] = rgb.r;
      glowColors[i * 3 + 1] = rgb.g;
      glowColors[i * 3 + 2] = rgb.b;
    }
    
    this.glowPoints.geometry.attributes.position.needsUpdate = true;
    this.glowPoints.geometry.attributes.color.needsUpdate = true;
    this.glowPoints.material.size = 0.2 + bass * 0.4;
    
    // Animate ambient particles
    const ambientPos = this.ambientParticles.geometry.attributes.position.array;
    for (let i = 0; i < 200; i++) {
      ambientPos[i * 3 + 1] += 0.01 + bass * 0.02;
      if (ambientPos[i * 3 + 1] > 8) {
        ambientPos[i * 3 + 1] = 0;
        ambientPos[i * 3] = (Math.random() - 0.5) * 20;
        ambientPos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 5;
      }
    }
    this.ambientParticles.geometry.attributes.position.needsUpdate = true;
    this.ambientParticles.material.opacity = 0.3 + mids * 0.4;
    
    // Floor color pulse
    this.floor.material.color.setHSL((this.time * 0.1) % 1, 0.5, 0.05 + bass * 0.1);
    
    return { shake: bass * 0.05, bloomBoost: volume * 1.2, color: '#00ff00' };
  }

  dispose() {
    this.objects.forEach(obj => {
      this.scene.remove(obj);
      obj.geometry.dispose();
      obj.material.dispose();
    });
  }
}
