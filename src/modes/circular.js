import * as THREE from 'three';

export class CircularMode {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
    this.sensitivity = 2.0;
    this.time = 0;
    this.lastBass = 0;
    this.init();
  }

  setSensitivity(val) { this.sensitivity = val; }

  init() {
    const segments = 256;
    this.rings = [];
    this.ringData = [];
    
    // More rings with varied properties
    for (let r = 0; r < 7; r++) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array((segments + 1) * 3);
      const colors = new Float32Array((segments + 1) * 3);
      
      const baseRadius = 1.5 + r * 0.6;
      const thickness = 0.03 + r * 0.005; // Thicker outer rings
      
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        positions[i * 3] = Math.cos(angle) * baseRadius;
        positions[i * 3 + 1] = Math.sin(angle) * baseRadius;
        positions[i * 3 + 2] = -r * 0.3;
        colors[i * 3] = 0; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 1;
      }
      
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      
      const ring = new THREE.Line(geometry, new THREE.LineBasicMaterial({ 
        vertexColors: true, 
        transparent: true, 
        opacity: 0.9 - r * 0.08,
        linewidth: 1 + r * 0.5
      }));
      this.scene.add(ring);
      this.rings.push(ring);
      this.objects.push(ring);
      
      this.ringData.push({
        baseRadius,
        rotationSpeed: (r % 2 === 0 ? 1 : -1) * (0.01 - r * 0.001),
        phase: r * 0.5,
        thickness
      });
    }
    
    // Center glow (multiple layers for soft effect)
    this.centerGlows = [];
    for (let i = 0; i < 4; i++) {
      const glowGeo = new THREE.CircleGeometry(0.3 + i * 0.15, 32);
      const glowMat = new THREE.MeshBasicMaterial({ 
        color: 0x00ffff, 
        transparent: true, 
        opacity: 0.4 - i * 0.08,
        blending: THREE.AdditiveBlending
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.z = 0.1 - i * 0.02;
      this.scene.add(glow);
      this.centerGlows.push(glow);
      this.objects.push(glow);
    }
    
    // Energy beams connecting rings on beats
    this.beams = [];
    for (let i = 0; i < 16; i++) {
      const beamGeo = new THREE.BufferGeometry();
      const beamPos = new Float32Array(6); // 2 points
      beamGeo.setAttribute('position', new THREE.BufferAttribute(beamPos, 3));
      
      const beam = new THREE.Line(beamGeo, new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending
      }));
      this.scene.add(beam);
      this.beams.push({
        mesh: beam,
        angle: (i / 16) * Math.PI * 2,
        active: 0
      });
      this.objects.push(beam);
    }
    
    // Particles emitting from ring edges
    const particleCount = 500;
    const particleGeo = new THREE.BufferGeometry();
    this.particlePositions = new Float32Array(particleCount * 3);
    this.particleColors = new Float32Array(particleCount * 3);
    this.particleVelocities = new Float32Array(particleCount * 3);
    this.particleLifetimes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      this.particlePositions[i * 3] = 0;
      this.particlePositions[i * 3 + 1] = 0;
      this.particlePositions[i * 3 + 2] = 0;
      this.particleLifetimes[i] = 0;
    }
    
    particleGeo.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3));
    
    this.particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    }));
    this.scene.add(this.particles);
    this.objects.push(this.particles);
    
    // Outer glow ring
    const outerGlowGeo = new THREE.RingGeometry(5.5, 6.5, 64);
    this.outerGlow = new THREE.Mesh(outerGlowGeo, new THREE.MeshBasicMaterial({
      color: 0x0066ff,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    }));
    this.outerGlow.position.z = -2;
    this.scene.add(this.outerGlow);
    this.objects.push(this.outerGlow);
    
    // Background radial gradient
    const bgGeo = new THREE.CircleGeometry(10, 64);
    this.bgCircle = new THREE.Mesh(bgGeo, new THREE.MeshBasicMaterial({
      color: 0x000022,
      transparent: true,
      opacity: 0.5
    }));
    this.bgCircle.position.z = -5;
    this.scene.add(this.bgCircle);
    this.objects.push(this.bgCircle);
  }

  spawnParticle(angle, radius, intensity) {
    // Find a dead particle
    for (let i = 0; i < this.particleLifetimes.length; i++) {
      if (this.particleLifetimes[i] <= 0) {
        this.particlePositions[i * 3] = Math.cos(angle) * radius;
        this.particlePositions[i * 3 + 1] = Math.sin(angle) * radius;
        this.particlePositions[i * 3 + 2] = 0;
        
        // Outward velocity
        const speed = 0.02 + intensity * 0.05;
        this.particleVelocities[i * 3] = Math.cos(angle) * speed;
        this.particleVelocities[i * 3 + 1] = Math.sin(angle) * speed;
        this.particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
        
        this.particleLifetimes[i] = 0.5 + Math.random() * 0.5;
        
        // Color
        const hue = (angle / (Math.PI * 2) + this.time * 0.1) % 1;
        this.particleColors[i * 3] = Math.sin(hue * Math.PI * 2) * 0.5 + 0.5;
        this.particleColors[i * 3 + 1] = Math.sin((hue + 0.33) * Math.PI * 2) * 0.5 + 0.5;
        this.particleColors[i * 3 + 2] = Math.sin((hue + 0.66) * Math.PI * 2) * 0.5 + 0.5;
        
        return;
      }
    }
  }

  update(audioData) {
    const { waveform, bass, volume, mids, highs, onBeat, animSpeed = 1 } = audioData;
    if (!waveform) return;
    
    this.time += 0.016 * animSpeed;
    const rotSpeed = animSpeed;
    
    // Spawn particles on beat
    if (onBeat && bass > 0.4) {
      const spawnCount = Math.floor(bass * 20);
      for (let i = 0; i < spawnCount; i++) {
        const ringIdx = Math.floor(Math.random() * this.rings.length);
        const angle = Math.random() * Math.PI * 2;
        const radius = this.ringData[ringIdx].baseRadius;
        this.spawnParticle(angle, radius, bass);
      }
    }
    
    // Update rings
    this.rings.forEach((ring, rIdx) => {
      const data = this.ringData[rIdx];
      const positions = ring.geometry.attributes.position.array;
      const colors = ring.geometry.attributes.color.array;
      const segments = (positions.length / 3) - 1;
      const step = Math.floor(waveform.length / segments);
      
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const dataIdx = (i % segments) * step;
        const val = ((waveform[dataIdx] / 128) - 1) * this.sensitivity;
        
        // Ripple effect: inner rings react first
        const rippleDelay = rIdx * 0.05;
        const delayedBass = Math.max(0, bass - rippleDelay);
        
        const radius = data.baseRadius + val * (1 + delayedBass * 2.5);
        
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = Math.sin(angle) * radius;
        
        // Color: coordinated palette (cyan -> magenta -> yellow)
        const hue = (i / segments + this.time * 0.05 + rIdx * 0.08) % 1;
        const sat = 0.8 + delayedBass * 0.2;
        const light = 0.4 + Math.abs(val) * 0.3;
        
        colors[i * 3] = Math.sin(hue * Math.PI * 2) * 0.5 + 0.5;
        colors[i * 3 + 1] = Math.sin((hue + 0.33) * Math.PI * 2) * 0.5 + 0.5;
        colors[i * 3 + 2] = Math.sin((hue + 0.66) * Math.PI * 2) * 0.5 + 0.5;
      }
      
      ring.geometry.attributes.position.needsUpdate = true;
      ring.geometry.attributes.color.needsUpdate = true;
      ring.rotation.z += data.rotationSpeed * (1 + bass * 0.5) * rotSpeed;
      ring.material.opacity = 0.5 + volume * 0.4;
    });
    
    // Center glow burst
    const glowScale = 0.5 + bass * 3;
    this.centerGlows.forEach((glow, i) => {
      const layerScale = glowScale * (1 + i * 0.3);
      glow.scale.set(layerScale, layerScale, 1);
      glow.material.opacity = (0.3 - i * 0.06) + bass * 0.3;
      glow.rotation.z = this.time * (0.5 - i * 0.1);
      
      // Color shift
      const hue = (this.time * 0.1 + i * 0.1) % 1;
      glow.material.color.setHSL(hue * 0.3 + 0.5, 1, 0.5);
    });
    
    // Energy beams on big beats
    if (onBeat && bass > 0.6 && this.lastBass < 0.5) {
      this.beams.forEach(beam => {
        if (Math.random() > 0.5) {
          beam.active = 1.0;
        }
      });
    }
    this.lastBass = bass;
    
    // Update beams
    this.beams.forEach(beam => {
      if (beam.active > 0) {
        beam.active -= 0.03;
        
        const innerRadius = 0.5;
        const outerRadius = 1.5 + this.rings.length * 0.6;
        const angle = beam.angle + this.time * 0.2;
        
        const positions = beam.mesh.geometry.attributes.position.array;
        positions[0] = Math.cos(angle) * innerRadius;
        positions[1] = Math.sin(angle) * innerRadius;
        positions[2] = 0;
        positions[3] = Math.cos(angle) * outerRadius;
        positions[4] = Math.sin(angle) * outerRadius;
        positions[5] = 0;
        
        beam.mesh.geometry.attributes.position.needsUpdate = true;
        beam.mesh.material.opacity = beam.active * 0.6;
        
        const hue = (angle / (Math.PI * 2) + this.time * 0.1) % 1;
        beam.mesh.material.color.setHSL(hue, 1, 0.6);
      } else {
        beam.mesh.material.opacity = 0;
      }
    });
    
    // Update particles
    for (let i = 0; i < this.particleLifetimes.length; i++) {
      if (this.particleLifetimes[i] > 0) {
        this.particleLifetimes[i] -= 0.016;
        
        this.particlePositions[i * 3] += this.particleVelocities[i * 3];
        this.particlePositions[i * 3 + 1] += this.particleVelocities[i * 3 + 1];
        this.particlePositions[i * 3 + 2] += this.particleVelocities[i * 3 + 2];
        
        // Fade colors
        this.particleColors[i * 3] *= 0.98;
        this.particleColors[i * 3 + 1] *= 0.98;
        this.particleColors[i * 3 + 2] *= 0.98;
      }
    }
    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.geometry.attributes.color.needsUpdate = true;
    this.particles.material.size = 0.05 + bass * 0.08;
    
    // Outer glow pulse
    this.outerGlow.material.opacity = 0.05 + bass * 0.15;
    this.outerGlow.rotation.z -= 0.002;
    const outerScale = 1 + bass * 0.2;
    this.outerGlow.scale.set(outerScale, outerScale, 1);
    
    return { shake: bass * 0.12, bloomBoost: volume * 1.8 + bass * 0.5, color: '#00ffff' };
  }

  dispose() {
    this.objects.forEach(obj => {
      this.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
  }
}
