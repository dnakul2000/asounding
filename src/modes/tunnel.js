import * as THREE from 'three';

export class TunnelMode {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
    this.sensitivity = 2.0;
    this.time = 0;
    this.currentShape = 'circle';
    this.morphProgress = 0;
    this.lastBass = 0;
    this.init();
  }

  setSensitivity(val) { this.sensitivity = val; }

  createRingGeometry(sides, innerRadius, outerRadius) {
    const shape = new THREE.Shape();
    
    for (let i = 0; i <= sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const x = Math.cos(angle) * outerRadius;
      const y = Math.sin(angle) * outerRadius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    
    const hole = new THREE.Path();
    for (let i = 0; i <= sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const x = Math.cos(angle) * innerRadius;
      const y = Math.sin(angle) * innerRadius;
      if (i === 0) hole.moveTo(x, y);
      else hole.lineTo(x, y);
    }
    shape.holes.push(hole);
    
    return new THREE.ShapeGeometry(shape);
  }

  init() {
    this.rings = [];
    this.ringData = [];
    
    // Create rings with varying polygon counts for morphing effect
    for (let i = 0; i < 40; i++) {
      const depth = -i * 2;
      const sides = 32; // Default circle (high count = smooth)
      
      // Main ring (filled with wireframe overlay)
      const innerRadius = 1.2 + Math.sin(i * 0.1) * 0.2;
      const outerRadius = innerRadius + 0.5;
      
      // Wireframe ring
      const wireGeo = new THREE.RingGeometry(innerRadius, outerRadius, sides);
      const wireMat = new THREE.MeshBasicMaterial({
        color: 0xff00ff,
        wireframe: true,
        transparent: true,
        opacity: 0.6
      });
      const wireRing = new THREE.Mesh(wireGeo, wireMat);
      wireRing.position.z = depth;
      this.scene.add(wireRing);
      this.rings.push(wireRing);
      this.objects.push(wireRing);
      
      // Solid ring (subtle fill)
      const solidGeo = new THREE.RingGeometry(innerRadius, outerRadius, sides);
      const solidMat = new THREE.MeshBasicMaterial({
        color: 0xff00ff,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide
      });
      const solidRing = new THREE.Mesh(solidGeo, solidMat);
      solidRing.position.z = depth - 0.01;
      this.scene.add(solidRing);
      this.objects.push(solidRing);
      
      this.ringData.push({
        wire: wireRing,
        solid: solidRing,
        baseInner: innerRadius,
        baseOuter: outerRadius,
        rotSpeed: (i % 2 === 0 ? 1 : -1) * (0.005 + i * 0.001),
        depth,
        index: i
      });
    }
    
    // Speed lines (more organized, converging)
    const lineCount = 80;
    const lineGeo = new THREE.BufferGeometry();
    const linePositions = new Float32Array(lineCount * 6); // 2 points per line
    const lineColors = new Float32Array(lineCount * 6);
    this.lineData = [];
    
    for (let i = 0; i < lineCount; i++) {
      const angle = (i / lineCount) * Math.PI * 2;
      const radius = 0.3 + Math.random() * 0.4;
      
      linePositions[i * 6] = Math.cos(angle) * radius;
      linePositions[i * 6 + 1] = Math.sin(angle) * radius;
      linePositions[i * 6 + 2] = -60;
      linePositions[i * 6 + 3] = Math.cos(angle) * radius * 1.02;
      linePositions[i * 6 + 4] = Math.sin(angle) * radius * 1.02;
      linePositions[i * 6 + 5] = -65;
      
      lineColors[i * 6] = 1;
      lineColors[i * 6 + 1] = 1;
      lineColors[i * 6 + 2] = 1;
      lineColors[i * 6 + 3] = 0.5;
      lineColors[i * 6 + 4] = 0.5;
      lineColors[i * 6 + 5] = 0.5;
      
      this.lineData.push({
        angle,
        radius,
        speed: 0.5 + Math.random() * 0.5
      });
    }
    
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    lineGeo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));
    
    this.speedLines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    }));
    this.scene.add(this.speedLines);
    this.objects.push(this.speedLines);
    
    // Center destination glow (something at the end)
    const destGlows = [];
    for (let i = 0; i < 3; i++) {
      const destGeo = new THREE.CircleGeometry(0.5 + i * 0.3, 32);
      const destMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.15 - i * 0.04,
        blending: THREE.AdditiveBlending
      });
      const dest = new THREE.Mesh(destGeo, destMat);
      dest.position.z = -80;
      this.scene.add(dest);
      destGlows.push(dest);
      this.objects.push(dest);
    }
    this.destinationGlows = destGlows;
    
    // Edge particles (flying past)
    const edgeParticleCount = 150;
    const edgeGeo = new THREE.BufferGeometry();
    this.edgePositions = new Float32Array(edgeParticleCount * 3);
    this.edgeColors = new Float32Array(edgeParticleCount * 3);
    this.edgeData = [];
    
    for (let i = 0; i < edgeParticleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.5 + Math.random() * 1;
      
      this.edgePositions[i * 3] = Math.cos(angle) * radius;
      this.edgePositions[i * 3 + 1] = Math.sin(angle) * radius;
      this.edgePositions[i * 3 + 2] = -Math.random() * 70;
      
      this.edgeColors[i * 3] = 1;
      this.edgeColors[i * 3 + 1] = 0.5;
      this.edgeColors[i * 3 + 2] = 1;
      
      this.edgeData.push({ angle, radius });
    }
    
    edgeGeo.setAttribute('position', new THREE.BufferAttribute(this.edgePositions, 3));
    edgeGeo.setAttribute('color', new THREE.BufferAttribute(this.edgeColors, 3));
    
    this.edgeParticles = new THREE.Points(edgeGeo, new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    }));
    this.scene.add(this.edgeParticles);
    this.objects.push(this.edgeParticles);
  }

  update(audioData) {
    const { waveform, bass, volume, mids, highs, onBeat, animSpeed = 1 } = audioData;
    if (!waveform) return;
    
    this.time += (0.1 + bass * 0.4) * animSpeed;
    const speed = (0.25 + bass * 0.6 * this.sensitivity) * animSpeed;
    
    // Shape morphing on big beats
    if (onBeat && bass > 0.7 && this.lastBass < 0.5) {
      const shapes = ['circle', 'hexagon', 'square', 'triangle', 'octagon'];
      const currentIdx = shapes.indexOf(this.currentShape);
      this.currentShape = shapes[(currentIdx + 1) % shapes.length];
      this.morphProgress = 0;
    }
    this.lastBass = bass;
    this.morphProgress = Math.min(1, this.morphProgress + 0.02);
    
    // Get target sides based on current shape
    const shapeSides = {
      'circle': 32,
      'hexagon': 6,
      'square': 4,
      'triangle': 3,
      'octagon': 8
    };
    const targetSides = shapeSides[this.currentShape];
    
    // Update rings
    this.ringData.forEach((data, i) => {
      const ring = data.wire;
      const solid = data.solid;
      
      // Move forward
      ring.position.z += speed;
      solid.position.z += speed;
      
      if (ring.position.z > 5) {
        ring.position.z = -75;
        solid.position.z = -75.01;
      }
      
      // Waveform-based deformation
      const waveIdx = Math.floor((i / this.ringData.length) * waveform.length);
      const waveVal = (waveform[waveIdx] / 128 - 1) * 0.5 * this.sensitivity;
      const scale = 1 + waveVal + bass * 0.4;
      
      ring.scale.set(scale, scale, 1);
      solid.scale.set(scale, scale, 1);
      
      // Rotation (alternating + mids influence)
      ring.rotation.z += data.rotSpeed * (1 + mids * 0.5);
      solid.rotation.z = ring.rotation.z;
      
      // Color based on position and audio
      const depth = Math.abs(ring.position.z);
      const hue = (i / this.ringData.length + this.time * 0.01) % 1;
      const brightness = Math.max(0.3, 1 - depth / 80);
      
      ring.material.color.setHSL(hue, 1, 0.5);
      ring.material.opacity = (0.4 + volume * 0.4) * brightness;
      solid.material.color.setHSL(hue, 0.8, 0.4);
      solid.material.opacity = (0.05 + bass * 0.1) * brightness;
    });
    
    // Speed lines
    const linePos = this.speedLines.geometry.attributes.position.array;
    const lineCol = this.speedLines.geometry.attributes.color.array;
    
    for (let i = 0; i < this.lineData.length; i++) {
      const data = this.lineData[i];
      const lineSpeed = speed * data.speed * 2;
      
      // Move both points forward
      linePos[i * 6 + 2] += lineSpeed;
      linePos[i * 6 + 5] += lineSpeed;
      
      // Reset when past camera
      if (linePos[i * 6 + 2] > 3) {
        linePos[i * 6 + 2] = -70;
        linePos[i * 6 + 5] = -75;
        data.angle = Math.random() * Math.PI * 2;
        data.radius = 0.3 + Math.random() * 0.4;
      }
      
      // Update positions based on angle/radius
      const stretchFactor = 1 + bass * 2; // Lines stretch on bass
      linePos[i * 6] = Math.cos(data.angle) * data.radius;
      linePos[i * 6 + 1] = Math.sin(data.angle) * data.radius;
      linePos[i * 6 + 3] = Math.cos(data.angle) * data.radius * 1.01;
      linePos[i * 6 + 4] = Math.sin(data.angle) * data.radius * 1.01;
      linePos[i * 6 + 5] = linePos[i * 6 + 2] - 3 * stretchFactor;
      
      // Brightness based on z position
      const brightness = Math.max(0, 1 - Math.abs(linePos[i * 6 + 2]) / 70);
      lineCol[i * 6] = brightness;
      lineCol[i * 6 + 1] = brightness * 0.8;
      lineCol[i * 6 + 2] = brightness;
    }
    
    this.speedLines.geometry.attributes.position.needsUpdate = true;
    this.speedLines.geometry.attributes.color.needsUpdate = true;
    this.speedLines.material.opacity = 0.3 + bass * 0.4;
    
    // Destination glow
    this.destinationGlows.forEach((glow, i) => {
      const pulseScale = 1 + Math.sin(this.time * 2 + i) * 0.2 + bass * 0.5;
      glow.scale.setScalar(pulseScale);
      glow.material.opacity = (0.1 - i * 0.03) + volume * 0.1;
      
      const hue = (this.time * 0.05) % 1;
      glow.material.color.setHSL(hue, 0.8, 0.6);
    });
    
    // Edge particles
    for (let i = 0; i < this.edgeData.length; i++) {
      this.edgePositions[i * 3 + 2] += speed * 1.5;
      
      if (this.edgePositions[i * 3 + 2] > 5) {
        const data = this.edgeData[i];
        data.angle = Math.random() * Math.PI * 2;
        data.radius = 1.5 + Math.random() * 1;
        
        this.edgePositions[i * 3] = Math.cos(data.angle) * data.radius;
        this.edgePositions[i * 3 + 1] = Math.sin(data.angle) * data.radius;
        this.edgePositions[i * 3 + 2] = -70;
      }
      
      // Color based on depth
      const depth = Math.abs(this.edgePositions[i * 3 + 2]);
      const brightness = Math.max(0, 1 - depth / 70);
      this.edgeColors[i * 3] = brightness;
      this.edgeColors[i * 3 + 1] = brightness * 0.3;
      this.edgeColors[i * 3 + 2] = brightness;
    }
    
    this.edgeParticles.geometry.attributes.position.needsUpdate = true;
    this.edgeParticles.geometry.attributes.color.needsUpdate = true;
    this.edgeParticles.material.size = 0.06 + highs * 0.06;
    
    return { shake: bass * 0.12, bloomBoost: volume * 1.8 + bass * 0.5, color: '#ff00ff' };
  }

  dispose() {
    this.objects.forEach(obj => { this.scene.remove(obj); obj.geometry.dispose(); obj.material.dispose(); });
  }
}
