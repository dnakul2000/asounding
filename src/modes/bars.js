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
    this.barPeaks = new Float32Array(barCount); // Peak hold
    this.barPeakDecay = new Float32Array(barCount);
    
    // Create bars in semi-circular arrangement with better 3D depth
    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount - 0.5) * Math.PI * 0.85;
      const radius = 5;
      
      // Use cylinder geometry for more visual weight
      const geometry = new THREE.CylinderGeometry(0.08, 0.12, 1, 8); // Tapered
      const material = new THREE.MeshBasicMaterial({ 
        color: 0x00ff00, 
        transparent: true, 
        opacity: 0.95
      });
      const bar = new THREE.Mesh(geometry, material);
      
      bar.position.x = Math.sin(angle) * radius;
      bar.position.z = -Math.cos(angle) * radius + 2;
      bar.position.y = 0;
      bar.rotation.y = angle;
      bar.scale.y = 0.01;
      
      this.scene.add(bar);
      this.bars.push(bar);
      this.objects.push(bar);
    }
    
    // Floor with gradient reflection
    const floorGeo = new THREE.PlaneGeometry(25, 18);
    this.floor = new THREE.Mesh(floorGeo, new THREE.MeshBasicMaterial({
      color: 0x000510,
      transparent: true,
      opacity: 0.6
    }));
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -0.02;
    this.scene.add(this.floor);
    this.objects.push(this.floor);
    
    // Reflection bars (with blur simulation - multiple layers)
    this.reflections = [];
    this.reflectionLayers = 3;
    for (let layer = 0; layer < this.reflectionLayers; layer++) {
      for (let i = 0; i < barCount; i++) {
        const bar = this.bars[i];
        const reflection = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08 + layer * 0.02, 0.12 + layer * 0.02, 1, 8),
          new THREE.MeshBasicMaterial({
            color: bar.material.color.clone(),
            transparent: true,
            opacity: 0.15 / (layer + 1)
          })
        );
        reflection.position.copy(bar.position);
        reflection.rotation.copy(bar.rotation);
        reflection.scale.y = 0.01;
        this.scene.add(reflection);
        this.reflections.push({ mesh: reflection, barIndex: i, layer });
        this.objects.push(reflection);
      }
    }
    
    // Peak indicators (floating dots above bars)
    this.peakIndicators = [];
    const peakGeo = new THREE.SphereGeometry(0.06, 8, 8);
    for (let i = 0; i < barCount; i++) {
      const peak = new THREE.Mesh(peakGeo, new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
      }));
      peak.position.copy(this.bars[i].position);
      peak.position.y = 0.1;
      this.scene.add(peak);
      this.peakIndicators.push(peak);
      this.objects.push(peak);
    }
    
    // Glow orbs at top of bars (more dramatic)
    const glowGeo = new THREE.BufferGeometry();
    const glowPos = new Float32Array(barCount * 3);
    const glowColors = new Float32Array(barCount * 3);
    const glowSizes = new Float32Array(barCount);
    glowGeo.setAttribute('position', new THREE.BufferAttribute(glowPos, 3));
    glowGeo.setAttribute('color', new THREE.BufferAttribute(glowColors, 3));
    glowGeo.setAttribute('size', new THREE.BufferAttribute(glowSizes, 1));
    
    this.glowPoints = new THREE.Points(glowGeo, new THREE.PointsMaterial({
      size: 0.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    }));
    this.scene.add(this.glowPoints);
    this.objects.push(this.glowPoints);
    
    // Secondary glow (larger, softer)
    this.glowPointsSoft = new THREE.Points(glowGeo.clone(), new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    }));
    this.scene.add(this.glowPointsSoft);
    this.objects.push(this.glowPointsSoft);
    
    // Background ambient particles (rising)
    const ambientGeo = new THREE.BufferGeometry();
    const ambientCount = 300;
    const ambientPos = new Float32Array(ambientCount * 3);
    const ambientColors = new Float32Array(ambientCount * 3);
    this.ambientData = [];
    
    for (let i = 0; i < ambientCount; i++) {
      ambientPos[i * 3] = (Math.random() - 0.5) * 25;
      ambientPos[i * 3 + 1] = Math.random() * 10;
      ambientPos[i * 3 + 2] = (Math.random() - 0.5) * 12 - 3;
      
      const hue = Math.random() * 0.3 + 0.4; // Cyan-green range
      ambientColors[i * 3] = Math.sin(hue * Math.PI * 2) * 0.5 + 0.5;
      ambientColors[i * 3 + 1] = Math.sin((hue + 0.33) * Math.PI * 2) * 0.5 + 0.5;
      ambientColors[i * 3 + 2] = Math.sin((hue + 0.66) * Math.PI * 2) * 0.5 + 0.5;
      
      this.ambientData.push({
        speed: 0.01 + Math.random() * 0.03,
        drift: (Math.random() - 0.5) * 0.01
      });
    }
    ambientGeo.setAttribute('position', new THREE.BufferAttribute(ambientPos, 3));
    ambientGeo.setAttribute('color', new THREE.BufferAttribute(ambientColors, 3));
    
    this.ambientParticles = new THREE.Points(ambientGeo, new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    }));
    this.scene.add(this.ambientParticles);
    this.objects.push(this.ambientParticles);
    
    // Horizontal glow lines (stage lighting effect)
    this.stageLines = [];
    for (let i = 0; i < 5; i++) {
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-12, 0.01, -8 + i * 1.5),
        new THREE.Vector3(12, 0.01, -8 + i * 1.5)
      ]);
      const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.1
      }));
      this.scene.add(line);
      this.stageLines.push(line);
      this.objects.push(line);
    }
  }

  update(audioData) {
    const { frequencies, bass, volume, mids, highs, onBeat, animSpeed = 1 } = audioData;
    if (!frequencies) return;
    
    this.time += 0.016 * animSpeed;
    const step = Math.floor(frequencies.length / this.barCount);
    
    const glowPositions = this.glowPoints.geometry.attributes.position.array;
    const glowColors = this.glowPoints.geometry.attributes.color.array;
    
    for (let i = 0; i < this.barCount; i++) {
      // Calculate bar value from frequency data
      let sum = 0;
      for (let j = 0; j < step; j++) sum += frequencies[i * step + j];
      const value = (sum / step / 255) * this.sensitivity * 3.5;
      
      // Enhanced spring physics with overshoot
      const target = Math.max(0.01, value);
      const diff = target - this.barTargets[i];
      
      // Stronger spring on attack, softer on release
      const springStrength = diff > 0 ? 0.5 : 0.25;
      const damping = diff > 0 ? 0.7 : 0.85;
      
      this.barVelocities[i] += diff * springStrength;
      this.barVelocities[i] *= damping;
      this.barTargets[i] += this.barVelocities[i];
      
      // Extra bounce on beat
      if (onBeat && bass > 0.5 && i % 4 === 0) {
        this.barVelocities[i] += 0.3;
      }
      
      const height = Math.max(0.01, this.barTargets[i]);
      const bar = this.bars[i];
      
      bar.scale.y = height;
      bar.position.y = height / 2;
      
      // Peak hold
      if (height > this.barPeaks[i]) {
        this.barPeaks[i] = height;
        this.barPeakDecay[i] = 0;
      } else {
        this.barPeakDecay[i] += 0.016;
        if (this.barPeakDecay[i] > 0.3) { // Hold for 0.3s
          this.barPeaks[i] -= 0.02;
          this.barPeaks[i] = Math.max(height, this.barPeaks[i]);
        }
      }
      
      // Update peak indicator
      const peak = this.peakIndicators[i];
      peak.position.y = this.barPeaks[i] + 0.15;
      peak.material.opacity = 0.3 + this.barPeaks[i] * 0.3;
      
      // Dynamic color based on frequency band and intensity
      const hue = (i / this.barCount) * 0.5 + this.time * 0.03; // Slowly cycling
      const saturation = 0.9;
      const lightness = 0.35 + height * 0.2 + bass * 0.15;
      bar.material.color.setHSL(hue % 1, saturation, Math.min(0.7, lightness));
      bar.material.opacity = 0.7 + height * 0.3;
      
      // Peak indicator color
      peak.material.color.setHSL((hue + 0.1) % 1, 1, 0.7);
      
      // Update reflections
      this.reflections.filter(r => r.barIndex === i).forEach(r => {
        const reflection = r.mesh;
        reflection.position.x = bar.position.x;
        reflection.position.z = bar.position.z;
        reflection.position.y = -height / 2 - r.layer * 0.05;
        reflection.scale.y = height * (0.5 - r.layer * 0.1);
        reflection.rotation.y = bar.rotation.y;
        reflection.material.color.copy(bar.material.color);
        reflection.material.opacity = (0.12 - r.layer * 0.03) + height * 0.05;
      });
      
      // Glow point at top of bar
      glowPositions[i * 3] = bar.position.x;
      glowPositions[i * 3 + 1] = height + 0.15;
      glowPositions[i * 3 + 2] = bar.position.z;
      
      const rgb = bar.material.color;
      glowColors[i * 3] = rgb.r;
      glowColors[i * 3 + 1] = rgb.g;
      glowColors[i * 3 + 2] = rgb.b;
    }
    
    // Update glow points
    this.glowPoints.geometry.attributes.position.needsUpdate = true;
    this.glowPoints.geometry.attributes.color.needsUpdate = true;
    this.glowPoints.material.size = 0.3 + bass * 0.6;
    
    // Update soft glow
    this.glowPointsSoft.geometry.attributes.position.array.set(glowPositions);
    this.glowPointsSoft.geometry.attributes.color.array.set(glowColors);
    this.glowPointsSoft.geometry.attributes.position.needsUpdate = true;
    this.glowPointsSoft.geometry.attributes.color.needsUpdate = true;
    this.glowPointsSoft.material.size = 0.6 + bass * 1.0;
    this.glowPointsSoft.material.opacity = 0.2 + bass * 0.3;
    
    // Animate ambient particles
    const ambientPos = this.ambientParticles.geometry.attributes.position.array;
    for (let i = 0; i < this.ambientData.length; i++) {
      const data = this.ambientData[i];
      ambientPos[i * 3] += data.drift + Math.sin(this.time + i) * 0.002;
      ambientPos[i * 3 + 1] += data.speed + bass * 0.03;
      
      if (ambientPos[i * 3 + 1] > 10) {
        ambientPos[i * 3 + 1] = 0;
        ambientPos[i * 3] = (Math.random() - 0.5) * 25;
        ambientPos[i * 3 + 2] = (Math.random() - 0.5) * 12 - 3;
      }
    }
    this.ambientParticles.geometry.attributes.position.needsUpdate = true;
    this.ambientParticles.material.opacity = 0.4 + mids * 0.4;
    this.ambientParticles.material.size = 0.05 + highs * 0.05;
    
    // Floor color pulse
    const floorHue = (this.time * 0.05) % 1;
    this.floor.material.color.setHSL(floorHue, 0.5, 0.03 + bass * 0.08);
    
    // Stage lines react to audio
    this.stageLines.forEach((line, i) => {
      const bandValue = i < 2 ? bass : (i < 4 ? mids : highs);
      line.material.opacity = 0.05 + bandValue * 0.2;
      line.material.color.setHSL((floorHue + i * 0.1) % 1, 1, 0.5);
    });
    
    return { shake: bass * 0.08, bloomBoost: volume * 1.5 + bass * 0.5, color: '#00ff88' };
  }

  dispose() {
    this.objects.forEach(obj => {
      this.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
  }
}
