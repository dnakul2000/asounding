import * as THREE from 'three';

export class KaleidoscopeMode {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
    this.sensitivity = 2.0;
    this.time = 0;
    this.segments = 8; // Number of mirror segments
    this.init();
  }

  setSensitivity(val) { this.sensitivity = val; }

  init() {
    // Create main group that will be mirrored
    this.mainGroup = new THREE.Group();
    this.scene.add(this.mainGroup);
    this.objects.push(this.mainGroup);
    
    // Create segment groups for kaleidoscope effect
    this.segmentGroups = [];
    for (let i = 0; i < this.segments; i++) {
      const group = new THREE.Group();
      group.rotation.z = (i / this.segments) * Math.PI * 2;
      // Mirror every other segment
      if (i % 2 === 1) {
        group.scale.x = -1;
      }
      this.scene.add(group);
      this.segmentGroups.push(group);
      this.objects.push(group);
    }
    
    // Base shapes that will be replicated
    this.shapes = [];
    this.shapeData = [];
    
    // Create various geometric shapes
    const shapeCount = 15;
    for (let i = 0; i < shapeCount; i++) {
      const type = i % 5;
      let geometry;
      
      switch(type) {
        case 0: geometry = new THREE.CircleGeometry(0.3, 6); break; // Hexagon
        case 1: geometry = new THREE.CircleGeometry(0.2, 3); break; // Triangle
        case 2: geometry = new THREE.RingGeometry(0.15, 0.25, 32); break; // Ring
        case 3: geometry = new THREE.PlaneGeometry(0.3, 0.3); break; // Square
        case 4: geometry = new THREE.CircleGeometry(0.15, 5); break; // Pentagon
      }
      
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      
      // Position in a wedge pattern
      const angle = (Math.random() * 0.5) * (Math.PI / this.segments);
      const radius = 0.5 + Math.random() * 3;
      mesh.position.x = Math.cos(angle) * radius;
      mesh.position.y = Math.sin(angle) * radius;
      mesh.position.z = (Math.random() - 0.5) * 2;
      
      this.shapes.push(mesh);
      this.shapeData.push({
        baseAngle: angle,
        baseRadius: radius,
        rotSpeed: (Math.random() - 0.5) * 0.05,
        pulsePhase: Math.random() * Math.PI * 2,
        orbitSpeed: (Math.random() - 0.5) * 0.02,
        type: type
      });
      
      // Add to all segment groups
      this.segmentGroups.forEach(group => {
        const clone = mesh.clone();
        clone.material = material.clone();
        group.add(clone);
      });
    }
    
    // Center mandala
    this.centerRings = [];
    for (let i = 0; i < 5; i++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.2 + i * 0.15, 0.25 + i * 0.15, 32),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending
        })
      );
      ring.position.z = 0.1;
      this.scene.add(ring);
      this.centerRings.push(ring);
      this.objects.push(ring);
    }
    
    // Center glow
    this.centerGlow = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
      })
    );
    this.centerGlow.position.z = 0.05;
    this.scene.add(this.centerGlow);
    this.objects.push(this.centerGlow);
    
    // Particle field
    const particleCount = 500;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    this.particleData = [];
    
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1 + Math.random() * 4;
      particlePos[i * 3] = Math.cos(angle) * radius;
      particlePos[i * 3 + 1] = Math.sin(angle) * radius;
      particlePos[i * 3 + 2] = (Math.random() - 0.5) * 2;
      particleColors[i * 3] = Math.random();
      particleColors[i * 3 + 1] = Math.random();
      particleColors[i * 3 + 2] = 1;
      this.particleData.push({
        angle,
        radius,
        speed: 0.01 + Math.random() * 0.02,
        zSpeed: (Math.random() - 0.5) * 0.02
      });
    }
    
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    
    this.particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    }));
    this.scene.add(this.particles);
    this.objects.push(this.particles);
  }

  update(audioData) {
    const { bass, volume, mids, highs, beatPhase = 0, onBeat, kickDetected, snareDetected, animSpeed = 1 } = audioData;
    
    // Animation speed affects time and all rotations
    this.time += 0.016 * (1 + bass * 0.5) * animSpeed;
    
    // Rotate entire kaleidoscope
    const rotationSpeed = 0.005 + mids * 0.02;
    this.segmentGroups.forEach((group, i) => {
      group.rotation.z = (i / this.segments) * Math.PI * 2 + this.time * rotationSpeed * (i % 2 === 0 ? 1 : -1);
    });
    
    // Update shapes in all segments
    this.segmentGroups.forEach(group => {
      group.children.forEach((mesh, idx) => {
        const data = this.shapeData[idx];
        if (!data) return;
        
        // Orbit animation
        const currentAngle = data.baseAngle + this.time * data.orbitSpeed;
        const radiusPulse = data.baseRadius + Math.sin(this.time * 2 + data.pulsePhase) * 0.3 * bass;
        
        mesh.position.x = Math.cos(currentAngle) * radiusPulse;
        mesh.position.y = Math.sin(currentAngle) * radiusPulse;
        
        // Rotation
        mesh.rotation.z += data.rotSpeed * (1 + bass);
        
        // Scale pulse
        const scale = 1 + bass * 0.5 * this.sensitivity + (onBeat ? 0.3 : 0);
        mesh.scale.setScalar(scale);
        
        // Color based on frequency band
        const hue = (this.time * 0.1 + idx * 0.05) % 1;
        const saturation = 0.8 + bass * 0.2;
        const lightness = 0.4 + volume * 0.3;
        mesh.material.color.setHSL(hue, saturation, lightness);
        mesh.material.opacity = 0.4 + bass * 0.4;
      });
    });
    
    // Center rings
    this.centerRings.forEach((ring, i) => {
      const scale = 1 + bass * (i + 1) * 0.2 * this.sensitivity;
      ring.scale.setScalar(scale);
      ring.rotation.z = this.time * (0.5 - i * 0.1) * (i % 2 === 0 ? 1 : -1);
      
      const hue = (this.time * 0.15 + i * 0.1) % 1;
      ring.material.color.setHSL(hue, 1, 0.5);
      ring.material.opacity = 0.3 + bass * 0.4;
    });
    
    // Center glow
    const glowScale = 0.5 + bass * 1.5 + (kickDetected ? 0.5 : 0);
    this.centerGlow.scale.setScalar(glowScale);
    this.centerGlow.material.opacity = 0.4 + bass * 0.5;
    this.centerGlow.material.color.setHSL((this.time * 0.2) % 1, 1, 0.6);
    
    // Particles
    const positions = this.particles.geometry.attributes.position.array;
    const colors = this.particles.geometry.attributes.color.array;
    
    for (let i = 0; i < this.particleData.length; i++) {
      const data = this.particleData[i];
      
      // Spiral motion
      data.angle += data.speed * (1 + bass);
      data.radius += (Math.sin(this.time + i) * 0.01 - 0.005) * bass;
      
      // Keep in bounds
      if (data.radius < 0.5) data.radius = 4;
      if (data.radius > 5) data.radius = 0.5;
      
      positions[i * 3] = Math.cos(data.angle) * data.radius;
      positions[i * 3 + 1] = Math.sin(data.angle) * data.radius;
      positions[i * 3 + 2] += data.zSpeed * bass;
      
      if (Math.abs(positions[i * 3 + 2]) > 2) {
        data.zSpeed *= -1;
      }
      
      // Color cycle
      const hue = (data.angle / (Math.PI * 2) + this.time * 0.1) % 1;
      colors[i * 3] = Math.sin(hue * Math.PI * 2) * 0.5 + 0.5;
      colors[i * 3 + 1] = Math.sin((hue + 0.33) * Math.PI * 2) * 0.5 + 0.5;
      colors[i * 3 + 2] = Math.sin((hue + 0.66) * Math.PI * 2) * 0.5 + 0.5;
    }
    
    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.geometry.attributes.color.needsUpdate = true;
    this.particles.material.size = 0.04 + bass * 0.06;
    
    return { shake: bass * 0.1, bloomBoost: volume * 1.5, color: '#ff00ff' };
  }

  dispose() {
    this.objects.forEach(obj => {
      this.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    
    this.segmentGroups.forEach(group => {
      group.children.forEach(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    });
  }
}
