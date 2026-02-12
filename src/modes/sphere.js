import * as THREE from 'three';

export class SphereMode {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
    this.init();
  }

  init() {
    // Main deformable sphere
    const geometry = new THREE.IcosahedronGeometry(2, 4);
    this.originalPositions = geometry.attributes.position.array.slice();
    
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });
    
    this.sphere = new THREE.Mesh(geometry, material);
    this.scene.add(this.sphere);
    this.objects.push(this.sphere);
    
    // Inner glow sphere
    const innerGeo = new THREE.IcosahedronGeometry(1.8, 3);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xff00ff,
      wireframe: true,
      transparent: true,
      opacity: 0.3
    });
    this.innerSphere = new THREE.Mesh(innerGeo, innerMat);
    this.scene.add(this.innerSphere);
    this.objects.push(this.innerSphere);
    
    // Core
    const coreGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9
    });
    this.core = new THREE.Mesh(coreGeo, coreMat);
    this.scene.add(this.core);
    this.objects.push(this.core);
    
    // Orbiting particles
    const particleCount = 500;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    this.particleAngles = new Float32Array(particleCount * 2);
    
    for (let i = 0; i < particleCount; i++) {
      this.particleAngles[i * 2] = Math.random() * Math.PI * 2;
      this.particleAngles[i * 2 + 1] = Math.random() * Math.PI;
      const r = 3 + Math.random() * 2;
      positions[i * 3] = Math.sin(this.particleAngles[i * 2 + 1]) * Math.cos(this.particleAngles[i * 2]) * r;
      positions[i * 3 + 1] = Math.sin(this.particleAngles[i * 2 + 1]) * Math.sin(this.particleAngles[i * 2]) * r;
      positions[i * 3 + 2] = Math.cos(this.particleAngles[i * 2 + 1]) * r;
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
    const { waveform, frequencies, bass, volume, mids, highs } = audioData;
    if (!waveform || !frequencies) return;
    
    // Deform sphere vertices based on audio
    const positions = this.sphere.geometry.attributes.position.array;
    const vertCount = positions.length / 3;
    
    for (let i = 0; i < vertCount; i++) {
      const ox = this.originalPositions[i * 3];
      const oy = this.originalPositions[i * 3 + 1];
      const oz = this.originalPositions[i * 3 + 2];
      
      // Map vertex to frequency
      const freqIdx = Math.floor((i / vertCount) * frequencies.length);
      const freqVal = frequencies[freqIdx] / 255;
      
      // Deform outward
      const deform = 1 + freqVal * 0.5 + bass * 0.3;
      positions[i * 3] = ox * deform;
      positions[i * 3 + 1] = oy * deform;
      positions[i * 3 + 2] = oz * deform;
    }
    this.sphere.geometry.attributes.position.needsUpdate = true;
    
    // Rotate
    this.sphere.rotation.x += 0.005 + mids * 0.02;
    this.sphere.rotation.y += 0.01 + bass * 0.03;
    
    this.innerSphere.rotation.x -= 0.007;
    this.innerSphere.rotation.y -= 0.012;
    const innerScale = 0.9 + bass * 0.3;
    this.innerSphere.scale.set(innerScale, innerScale, innerScale);
    
    // Core pulse
    const coreScale = 0.5 + bass * 1.5;
    this.core.scale.set(coreScale, coreScale, coreScale);
    
    // Orbit particles
    const particlePos = this.particles.geometry.attributes.position.array;
    const particleCount = particlePos.length / 3;
    for (let i = 0; i < particleCount; i++) {
      this.particleAngles[i * 2] += 0.01 + bass * 0.05;
      const r = 3 + Math.sin(Date.now() * 0.001 + i) * 0.5 + bass;
      particlePos[i * 3] = Math.sin(this.particleAngles[i * 2 + 1]) * Math.cos(this.particleAngles[i * 2]) * r;
      particlePos[i * 3 + 1] = Math.sin(this.particleAngles[i * 2 + 1]) * Math.sin(this.particleAngles[i * 2]) * r;
      particlePos[i * 3 + 2] = Math.cos(this.particleAngles[i * 2 + 1]) * r;
    }
    this.particles.geometry.attributes.position.needsUpdate = true;
    
    // Color shift
    const hue = (Date.now() * 0.0001) % 1;
    this.sphere.material.color.setHSL(hue, 1, 0.5);
    this.innerSphere.material.color.setHSL((hue + 0.5) % 1, 1, 0.5);
    
    return { shake: bass * 0.15, bloomBoost: volume * 1.2 };
  }

  dispose() {
    this.objects.forEach(obj => {
      this.scene.remove(obj);
      obj.geometry.dispose();
      obj.material.dispose();
    });
  }
}
