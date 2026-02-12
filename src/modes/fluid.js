import * as THREE from 'three';

/**
 * Fluid/Smoke simulation using particles with velocity fields
 * Creates organic, flowing visuals that react to audio
 */
export class FluidMode {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
    this.sensitivity = 2.0;
    this.time = 0;
    
    // Fluid simulation parameters
    this.particleCount = 8000;
    this.noiseScale = 0.5;
    this.flowSpeed = 0.3;
    
    this.init();
  }

  setSensitivity(val) { this.sensitivity = val; }

  // Simple noise function for flow field
  noise3D(x, y, z) {
    // Simplified Perlin-like noise using sin combinations
    const n = Math.sin(x * 1.5) * Math.cos(y * 1.3) + 
              Math.sin(y * 1.7) * Math.cos(z * 1.1) + 
              Math.sin(z * 1.2) * Math.cos(x * 1.6);
    return n / 3;
  }

  init() {
    // Main particle system
    const geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.sizes = new Float32Array(this.particleCount);
    this.lifetimes = new Float32Array(this.particleCount);
    
    for (let i = 0; i < this.particleCount; i++) {
      this.resetParticle(i, true);
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    
    this.particles = new THREE.Points(geometry, new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    this.scene.add(this.particles);
    this.objects.push(this.particles);
    
    // Smoke trail particles (larger, more diffuse)
    const trailGeo = new THREE.BufferGeometry();
    this.trailPositions = new Float32Array(2000 * 3);
    this.trailColors = new Float32Array(2000 * 3);
    
    for (let i = 0; i < 2000; i++) {
      this.trailPositions[i * 3] = (Math.random() - 0.5) * 15;
      this.trailPositions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      this.trailPositions[i * 3 + 2] = (Math.random() - 0.5) * 5;
      this.trailColors[i * 3] = 0.2;
      this.trailColors[i * 3 + 1] = 0.1;
      this.trailColors[i * 3 + 2] = 0.3;
    }
    
    trailGeo.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    trailGeo.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3));
    
    this.trailParticles = new THREE.Points(trailGeo, new THREE.PointsMaterial({
      size: 0.25,
      vertexColors: true,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    this.scene.add(this.trailParticles);
    this.objects.push(this.trailParticles);
    
    // Emitter points (audio-reactive)
    this.emitters = [
      { x: 0, y: 0, z: 0, strength: 1 },
      { x: -3, y: 0, z: 0, strength: 0.5 },
      { x: 3, y: 0, z: 0, strength: 0.5 },
      { x: 0, y: 2, z: 0, strength: 0.3 },
      { x: 0, y: -2, z: 0, strength: 0.3 }
    ];
    
    // Create emitter visualizations
    this.emitterMeshes = [];
    this.emitters.forEach((emitter, i) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 16, 16),
        new THREE.MeshBasicMaterial({
          color: 0x00ffff,
          transparent: true,
          opacity: 0.5,
          blending: THREE.AdditiveBlending
        })
      );
      mesh.position.set(emitter.x, emitter.y, emitter.z);
      this.scene.add(mesh);
      this.emitterMeshes.push(mesh);
      this.objects.push(mesh);
    });
    
    // Background gradient mesh
    const bgGeo = new THREE.PlaneGeometry(30, 20);
    this.bgMesh = new THREE.Mesh(bgGeo, new THREE.MeshBasicMaterial({
      color: 0x000011,
      transparent: true,
      opacity: 0.5
    }));
    this.bgMesh.position.z = -10;
    this.scene.add(this.bgMesh);
    this.objects.push(this.bgMesh);
    
    // Flow field indicators (optional visualization)
    this.flowIndicators = [];
  }

  resetParticle(i, initial = false) {
    // Spawn from random emitter
    const emitter = this.emitters[Math.floor(Math.random() * this.emitters.length)];
    
    this.positions[i * 3] = emitter.x + (Math.random() - 0.5) * 0.5;
    this.positions[i * 3 + 1] = emitter.y + (Math.random() - 0.5) * 0.5;
    this.positions[i * 3 + 2] = emitter.z + (Math.random() - 0.5) * 0.5;
    
    this.velocities[i * 3] = (Math.random() - 0.5) * 0.02;
    this.velocities[i * 3 + 1] = Math.random() * 0.02 + 0.01; // Upward bias
    this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    
    this.lifetimes[i] = initial ? Math.random() : 1.0;
    this.sizes[i] = 0.05 + Math.random() * 0.05;
    
    // Color based on emitter
    const hue = Math.random() * 0.3 + 0.5; // Blue-purple range
    const rgb = this.hslToRgb(hue, 1, 0.5);
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

  getFlowVelocity(x, y, z, bass, mids) {
    // Create swirling flow field using noise
    const scale = this.noiseScale;
    const t = this.time * this.flowSpeed;
    
    // Sample noise at particle position
    const nx = this.noise3D(x * scale + t, y * scale, z * scale);
    const ny = this.noise3D(x * scale, y * scale + t, z * scale + 100);
    const nz = this.noise3D(x * scale + 200, y * scale, z * scale + t);
    
    // Add audio reactivity
    const audioBoost = 1 + bass * 2 * this.sensitivity;
    
    // Curl-like flow (rotate noise gradient)
    return {
      x: ny * 0.02 * audioBoost,
      y: (0.01 + nz * 0.015 + mids * 0.02) * audioBoost, // Upward flow
      z: nx * 0.015 * audioBoost
    };
  }

  update(audioData) {
    const { bass, volume, mids, highs, onBeat, kickDetected, snareDetected, beatPhase = 0 } = audioData;
    
    this.time += 0.016;
    
    const positions = this.positions;
    const velocities = this.velocities;
    const colors = this.colors;
    
    // Update main particles
    for (let i = 0; i < this.particleCount; i++) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];
      
      // Get flow field velocity
      const flow = this.getFlowVelocity(x, y, z, bass, mids);
      
      // Apply flow
      velocities[i * 3] += flow.x;
      velocities[i * 3 + 1] += flow.y;
      velocities[i * 3 + 2] += flow.z;
      
      // Add turbulence on beats
      if (kickDetected) {
        velocities[i * 3] += (Math.random() - 0.5) * 0.1;
        velocities[i * 3 + 1] += Math.random() * 0.15;
        velocities[i * 3 + 2] += (Math.random() - 0.5) * 0.1;
      }
      
      // Damping
      velocities[i * 3] *= 0.98;
      velocities[i * 3 + 1] *= 0.98;
      velocities[i * 3 + 2] *= 0.98;
      
      // Update position
      positions[i * 3] += velocities[i * 3];
      positions[i * 3 + 1] += velocities[i * 3 + 1];
      positions[i * 3 + 2] += velocities[i * 3 + 2];
      
      // Update lifetime
      this.lifetimes[i] -= 0.003 + bass * 0.002;
      
      // Color fade with lifetime and audio
      const life = Math.max(0, this.lifetimes[i]);
      const hue = (this.time * 0.05 + y * 0.1 + bass * 0.2) % 1;
      const rgb = this.hslToRgb(hue, 0.8 + bass * 0.2, 0.3 + life * 0.4);
      colors[i * 3] = rgb.r * life;
      colors[i * 3 + 1] = rgb.g * life;
      colors[i * 3 + 2] = rgb.b * life;
      
      // Reset if dead or out of bounds
      if (this.lifetimes[i] <= 0 || 
          Math.abs(x) > 10 || 
          y > 8 || y < -5 || 
          Math.abs(z) > 5) {
        this.resetParticle(i);
      }
    }
    
    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.geometry.attributes.color.needsUpdate = true;
    this.particles.material.size = 0.06 + bass * 0.08;
    this.particles.material.opacity = 0.5 + volume * 0.4;
    
    // Update trail particles
    const trailPos = this.trailPositions;
    const trailCol = this.trailColors;
    
    for (let i = 0; i < 2000; i++) {
      const x = trailPos[i * 3];
      const y = trailPos[i * 3 + 1];
      const z = trailPos[i * 3 + 2];
      
      // Slower flow for trails
      const flow = this.getFlowVelocity(x * 0.5, y * 0.5, z * 0.5, bass * 0.3, mids * 0.3);
      
      trailPos[i * 3] += flow.x * 0.5;
      trailPos[i * 3 + 1] += flow.y * 0.3;
      trailPos[i * 3 + 2] += flow.z * 0.5;
      
      // Wrap around
      if (trailPos[i * 3] > 10) trailPos[i * 3] = -10;
      if (trailPos[i * 3] < -10) trailPos[i * 3] = 10;
      if (trailPos[i * 3 + 1] > 8) trailPos[i * 3 + 1] = -5;
      if (trailPos[i * 3 + 2] > 5) trailPos[i * 3 + 2] = -5;
      if (trailPos[i * 3 + 2] < -5) trailPos[i * 3 + 2] = 5;
      
      // Color
      const hue = (this.time * 0.02 + y * 0.05) % 1;
      const rgb = this.hslToRgb(hue, 0.5, 0.2 + bass * 0.2);
      trailCol[i * 3] = rgb.r;
      trailCol[i * 3 + 1] = rgb.g;
      trailCol[i * 3 + 2] = rgb.b;
    }
    
    this.trailParticles.geometry.attributes.position.needsUpdate = true;
    this.trailParticles.geometry.attributes.color.needsUpdate = true;
    this.trailParticles.material.opacity = 0.2 + bass * 0.2;
    
    // Update emitters
    this.emitters[0].strength = 1 + bass * 2;
    this.emitters[1].strength = 0.5 + mids;
    this.emitters[2].strength = 0.5 + mids;
    this.emitters[3].strength = 0.3 + highs;
    this.emitters[4].strength = 0.3 + highs;
    
    this.emitterMeshes.forEach((mesh, i) => {
      const scale = 0.1 + this.emitters[i].strength * 0.3;
      mesh.scale.setScalar(scale);
      mesh.material.opacity = 0.3 + this.emitters[i].strength * 0.4;
      
      const hue = (this.time * 0.1 + i * 0.2) % 1;
      mesh.material.color.setHSL(hue, 1, 0.5);
    });
    
    // Background pulse
    this.bgMesh.material.color.setHSL((this.time * 0.02) % 1, 0.3, 0.02 + bass * 0.03);
    
    return { shake: bass * 0.05, bloomBoost: volume * 1.5 + bass, color: '#6600ff' };
  }

  dispose() {
    this.objects.forEach(obj => {
      this.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
  }
}
