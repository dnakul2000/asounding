import * as THREE from 'three';

export class WaveformMode {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
    this.sensitivity = 2.0;
    this.time = 0;
    this.lastBass = 0;
    this.burstParticles = [];
    this.init();
  }

  setSensitivity(val) {
    this.sensitivity = val;
  }

  init() {
    const segments = 512;
    
    // Main wave with glow effect (thicker line + blur simulation)
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(segments * 3);
    const colors = new Float32Array(segments * 3);
    
    for (let i = 0; i < segments; i++) {
      positions[i * 3] = (i / segments - 0.5) * 14;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      // Default to cyan instead of orange (more modern)
      colors[i * 3] = 0;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Main wave (bright core)
    this.mainWave = new THREE.Line(geometry, new THREE.LineBasicMaterial({ 
      vertexColors: true,
      linewidth: 2
    }));
    this.scene.add(this.mainWave);
    this.objects.push(this.mainWave);
    
    // Glow layer (slightly offset, more transparent)
    this.glowWave = new THREE.Line(geometry.clone(), new THREE.LineBasicMaterial({ 
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      linewidth: 3
    }));
    this.glowWave.position.z = -0.05;
    this.glowWave.scale.y = 1.3;
    this.scene.add(this.glowWave);
    this.objects.push(this.glowWave);
    
    // Mirror wave
    this.mirrorWave = new THREE.Line(geometry.clone(), new THREE.LineBasicMaterial({ 
      vertexColors: true,
      transparent: true,
      opacity: 0.7
    }));
    this.mirrorWave.scale.y = -1;
    this.scene.add(this.mirrorWave);
    this.objects.push(this.mirrorWave);
    
    // Mirror glow
    this.mirrorGlow = new THREE.Line(geometry.clone(), new THREE.LineBasicMaterial({ 
      vertexColors: true,
      transparent: true,
      opacity: 0.25
    }));
    this.mirrorGlow.scale.y = -1.3;
    this.mirrorGlow.position.z = -0.05;
    this.scene.add(this.mirrorGlow);
    this.objects.push(this.mirrorGlow);
    
    // Trails with depth
    this.trails = [];
    for (let t = 0; t < 12; t++) {
      const trail = new THREE.Line(
        geometry.clone(),
        new THREE.LineBasicMaterial({ 
          vertexColors: true, 
          transparent: true, 
          opacity: (1 - t/12) * 0.25
        })
      );
      trail.position.z = -t * 0.3 - 0.5;
      trail.scale.set(1 + t * 0.02, 1 + t * 0.05, 1); // Trails expand slightly
      this.scene.add(trail);
      this.trails.push(trail);
      this.objects.push(trail);
      
      const mirrorTrail = new THREE.Line(
        geometry.clone(),
        new THREE.LineBasicMaterial({ 
          vertexColors: true, 
          transparent: true, 
          opacity: (1 - t/12) * 0.15
        })
      );
      mirrorTrail.scale.y = -1 - t * 0.05;
      mirrorTrail.scale.x = 1 + t * 0.02;
      mirrorTrail.position.z = -t * 0.3 - 0.5;
      this.scene.add(mirrorTrail);
      this.trails.push(mirrorTrail);
      this.objects.push(mirrorTrail);
    }
    
    // Burst particles (spawn on big hits)
    const burstGeo = new THREE.BufferGeometry();
    const burstPositions = new Float32Array(200 * 3);
    const burstColors = new Float32Array(200 * 3);
    this.burstVelocities = new Float32Array(200 * 3);
    this.burstLifetimes = new Float32Array(200);
    
    for (let i = 0; i < 200; i++) {
      burstPositions[i * 3] = 0;
      burstPositions[i * 3 + 1] = 0;
      burstPositions[i * 3 + 2] = 0;
      burstColors[i * 3] = 0;
      burstColors[i * 3 + 1] = 1;
      burstColors[i * 3 + 2] = 1;
      this.burstLifetimes[i] = 0;
    }
    
    burstGeo.setAttribute('position', new THREE.BufferAttribute(burstPositions, 3));
    burstGeo.setAttribute('color', new THREE.BufferAttribute(burstColors, 3));
    
    this.burstPoints = new THREE.Points(burstGeo, new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    }));
    this.scene.add(this.burstPoints);
    this.objects.push(this.burstPoints);
    
    // Peak glow orbs (positioned at waveform peaks)
    this.peakOrbs = [];
    for (let i = 0; i < 8; i++) {
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 8),
        new THREE.MeshBasicMaterial({
          color: 0x00ffff,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending
        })
      );
      orb.visible = false;
      this.scene.add(orb);
      this.peakOrbs.push(orb);
      this.objects.push(orb);
    }
    
    // Horizontal reference lines (subtle grid)
    for (let i = -2; i <= 2; i++) {
      if (i === 0) continue;
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-7, i * 0.5, -1),
        new THREE.Vector3(7, i * 0.5, -1)
      ]);
      const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.05
      }));
      this.scene.add(line);
      this.objects.push(line);
    }
  }

  spawnBurst(x, y, intensity) {
    const positions = this.burstPoints.geometry.attributes.position.array;
    const colors = this.burstPoints.geometry.attributes.color.array;
    
    // Find dead particles to respawn
    let spawned = 0;
    const toSpawn = Math.floor(intensity * 30);
    
    for (let i = 0; i < 200 && spawned < toSpawn; i++) {
      if (this.burstLifetimes[i] <= 0) {
        positions[i * 3] = x + (Math.random() - 0.5) * 0.5;
        positions[i * 3 + 1] = y + (Math.random() - 0.5) * 0.3;
        positions[i * 3 + 2] = 0;
        
        // Velocity: outward from wave
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.05 + Math.random() * 0.15 * intensity;
        this.burstVelocities[i * 3] = Math.cos(angle) * speed * 0.5;
        this.burstVelocities[i * 3 + 1] = Math.sin(angle) * speed + Math.abs(y) * 0.05;
        this.burstVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
        
        this.burstLifetimes[i] = 0.5 + Math.random() * 0.5;
        
        // Color matches position on wave
        const hue = (x / 14 + 0.5) * 0.3 + 0.5; // Cyan to magenta
        colors[i * 3] = Math.sin(hue * Math.PI * 2) * 0.5 + 0.5;
        colors[i * 3 + 1] = Math.sin((hue + 0.33) * Math.PI * 2) * 0.5 + 0.5;
        colors[i * 3 + 2] = Math.sin((hue + 0.66) * Math.PI * 2) * 0.5 + 0.5;
        
        spawned++;
      }
    }
  }

  update(audioData) {
    const { waveform, bass, volume, mids, highs, onBeat, animSpeed = 1, trailLength = 1 } = audioData;
    if (!waveform) return;
    
    this.time += 0.016 * animSpeed;
    
    // Trail length affects opacity and how many trails are visible
    const trailOpacityScale = trailLength;
    
    // Shift trail positions (ring buffer style would be better but this works)
    for (let t = this.trails.length - 1; t >= 2; t--) {
      const curr = this.trails[t].geometry.attributes.position.array;
      const prev = this.trails[t - 2].geometry.attributes.position.array;
      for (let i = 0; i < curr.length; i++) curr[i] = prev[i];
      this.trails[t].geometry.attributes.position.needsUpdate = true;
      const baseOpacity = (1 - (t/2) / (this.trails.length/2)) * 0.25;
      this.trails[t].material.opacity = baseOpacity * trailOpacityScale;
    }
    
    // Find peaks for orbs and burst effects
    const peaks = [];
    let prevVal = 0;
    let prevDir = 0;
    
    // Update main waves
    [this.mainWave, this.mirrorWave, this.glowWave, this.mirrorGlow].forEach((wave, waveIdx) => {
      const pos = wave.geometry.attributes.position.array;
      const col = wave.geometry.attributes.color.array;
      const segments = pos.length / 3;
      const step = Math.floor(waveform.length / segments);
      
      for (let i = 0; i < segments; i++) {
        const val = ((waveform[i * step] / 128) - 1) * this.sensitivity;
        const boostedVal = val * (1 + bass * 3);
        pos[i * 3 + 1] = boostedVal * (waveIdx >= 2 ? 1.1 : 1); // Glow layers slightly bigger
        
        // Detect peaks (only on main wave)
        if (waveIdx === 0) {
          const dir = val > prevVal ? 1 : -1;
          if (prevDir > 0 && dir < 0 && Math.abs(prevVal) > 0.3) {
            peaks.push({ x: pos[(i-1) * 3], y: prevVal * (1 + bass * 3), intensity: Math.abs(prevVal) });
          }
          prevDir = dir;
          prevVal = val;
        }
        
        // Color: cyan -> magenta based on position and amplitude
        const t = i / segments;
        const amp = Math.abs(val);
        const hue = t * 0.2 + 0.5 + amp * 0.1 + this.time * 0.05; // Slowly cycling
        
        col[i * 3] = Math.sin(hue * Math.PI * 2) * 0.5 + 0.5;
        col[i * 3 + 1] = Math.sin((hue + 0.33) * Math.PI * 2) * 0.3 + 0.7; // Keep greenish
        col[i * 3 + 2] = 1; // Always high blue
      }
      wave.geometry.attributes.position.needsUpdate = true;
      wave.geometry.attributes.color.needsUpdate = true;
    });
    
    // Update peak orbs
    peaks.slice(0, 8).forEach((peak, i) => {
      const orb = this.peakOrbs[i];
      orb.visible = true;
      orb.position.set(peak.x, peak.y, 0.1);
      const scale = 0.1 + peak.intensity * 0.4;
      orb.scale.setScalar(scale);
      orb.material.opacity = peak.intensity * 0.6;
    });
    
    // Hide unused orbs
    for (let i = peaks.length; i < this.peakOrbs.length; i++) {
      this.peakOrbs[i].material.opacity *= 0.9;
      if (this.peakOrbs[i].material.opacity < 0.01) {
        this.peakOrbs[i].visible = false;
      }
    }
    
    // Spawn burst particles on beat
    if (onBeat && bass > 0.5 && this.lastBass < 0.4) {
      // Spawn bursts at random peak positions
      const burstCount = Math.min(5, peaks.length);
      for (let i = 0; i < burstCount; i++) {
        const peak = peaks[Math.floor(Math.random() * peaks.length)];
        if (peak) {
          this.spawnBurst(peak.x, peak.y, bass);
          this.spawnBurst(peak.x, -peak.y, bass * 0.7); // Mirror burst
        }
      }
    }
    this.lastBass = bass;
    
    // Update burst particles
    const burstPos = this.burstPoints.geometry.attributes.position.array;
    const burstCol = this.burstPoints.geometry.attributes.color.array;
    
    for (let i = 0; i < 200; i++) {
      if (this.burstLifetimes[i] > 0) {
        this.burstLifetimes[i] -= 0.016;
        
        // Apply velocity
        burstPos[i * 3] += this.burstVelocities[i * 3];
        burstPos[i * 3 + 1] += this.burstVelocities[i * 3 + 1];
        burstPos[i * 3 + 2] += this.burstVelocities[i * 3 + 2];
        
        // Gravity
        this.burstVelocities[i * 3 + 1] -= 0.002;
        
        // Fade
        const life = Math.max(0, this.burstLifetimes[i]);
        burstCol[i * 3] *= 0.98;
        burstCol[i * 3 + 1] *= 0.99;
        burstCol[i * 3 + 2] *= 0.99;
      }
    }
    this.burstPoints.geometry.attributes.position.needsUpdate = true;
    this.burstPoints.geometry.attributes.color.needsUpdate = true;
    this.burstPoints.material.size = 0.06 + bass * 0.1;
    
    // Copy to first trail positions
    if (this.trails.length > 1) {
      const mainPos = this.mainWave.geometry.attributes.position.array;
      this.trails[0].geometry.attributes.position.array.set(mainPos);
      this.trails[1].geometry.attributes.position.array.set(mainPos);
      this.trails[0].geometry.attributes.position.needsUpdate = true;
      this.trails[1].geometry.attributes.position.needsUpdate = true;
    }
    
    // Wave expansion on bass (horizontal stretch)
    const scaleX = 1 + bass * 0.1;
    this.mainWave.scale.x = scaleX;
    this.mirrorWave.scale.x = scaleX;
    this.glowWave.scale.x = scaleX;
    this.mirrorGlow.scale.x = scaleX;
    
    return { shake: bass * 0.15, bloomBoost: volume + bass * 0.5, color: '#00ffff' };
  }

  dispose() {
    this.objects.forEach(obj => {
      this.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
  }
}
