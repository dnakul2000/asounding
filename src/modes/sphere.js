import * as THREE from 'three';

export class SphereMode {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
    this.sensitivity = 2.0;
    this.init();
  }

  setSensitivity(val) { this.sensitivity = val; }

  init() {
    const geometry = new THREE.IcosahedronGeometry(2, 4);
    this.originalPositions = geometry.attributes.position.array.slice();
    this.sphere = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, transparent: true, opacity: 0.8 }));
    this.scene.add(this.sphere);
    this.objects.push(this.sphere);
    
    const innerGeo = new THREE.IcosahedronGeometry(1.8, 3);
    this.innerSphere = new THREE.Mesh(innerGeo, new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true, transparent: true, opacity: 0.3 }));
    this.scene.add(this.innerSphere);
    this.objects.push(this.innerSphere);
    
    this.core = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }));
    this.scene.add(this.core);
    this.objects.push(this.core);
    
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(500 * 3);
    this.particleAngles = new Float32Array(500 * 2);
    for (let i = 0; i < 500; i++) {
      this.particleAngles[i * 2] = Math.random() * Math.PI * 2;
      this.particleAngles[i * 2 + 1] = Math.random() * Math.PI;
      const r = 3 + Math.random() * 2;
      positions[i * 3] = Math.sin(this.particleAngles[i * 2 + 1]) * Math.cos(this.particleAngles[i * 2]) * r;
      positions[i * 3 + 1] = Math.sin(this.particleAngles[i * 2 + 1]) * Math.sin(this.particleAngles[i * 2]) * r;
      positions[i * 3 + 2] = Math.cos(this.particleAngles[i * 2 + 1]) * r;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({ color: 0x00ffff, size: 0.05, transparent: true, blending: THREE.AdditiveBlending }));
    this.scene.add(this.particles);
    this.objects.push(this.particles);
  }

  update(audioData) {
    const { frequencies, bass, volume, mids } = audioData;
    if (!frequencies) return;
    
    const positions = this.sphere.geometry.attributes.position.array;
    const vertCount = positions.length / 3;
    for (let i = 0; i < vertCount; i++) {
      const freqIdx = Math.floor((i / vertCount) * frequencies.length);
      const freqVal = frequencies[freqIdx] / 255;
      const deform = 1 + freqVal * 0.5 * this.sensitivity + bass * 0.3;
      positions[i * 3] = this.originalPositions[i * 3] * deform;
      positions[i * 3 + 1] = this.originalPositions[i * 3 + 1] * deform;
      positions[i * 3 + 2] = this.originalPositions[i * 3 + 2] * deform;
    }
    this.sphere.geometry.attributes.position.needsUpdate = true;
    this.sphere.rotation.x += 0.005 + mids * 0.02;
    this.sphere.rotation.y += 0.01 + bass * 0.03;
    
    this.innerSphere.rotation.x -= 0.007;
    this.innerSphere.rotation.y -= 0.012;
    const innerScale = 0.9 + bass * 0.3;
    this.innerSphere.scale.set(innerScale, innerScale, innerScale);
    
    const coreScale = 0.5 + bass * 1.5;
    this.core.scale.set(coreScale, coreScale, coreScale);
    
    const particlePos = this.particles.geometry.attributes.position.array;
    for (let i = 0; i < 500; i++) {
      this.particleAngles[i * 2] += 0.01 + bass * 0.05;
      const r = 3 + Math.sin(Date.now() * 0.001 + i) * 0.5 + bass;
      particlePos[i * 3] = Math.sin(this.particleAngles[i * 2 + 1]) * Math.cos(this.particleAngles[i * 2]) * r;
      particlePos[i * 3 + 1] = Math.sin(this.particleAngles[i * 2 + 1]) * Math.sin(this.particleAngles[i * 2]) * r;
      particlePos[i * 3 + 2] = Math.cos(this.particleAngles[i * 2 + 1]) * r;
    }
    this.particles.geometry.attributes.position.needsUpdate = true;
    
    const hue = (Date.now() * 0.0001) % 1;
    this.sphere.material.color.setHSL(hue, 1, 0.5);
    this.innerSphere.material.color.setHSL((hue + 0.5) % 1, 1, 0.5);
    
    return { shake: bass * 0.15, bloomBoost: volume * 1.2, color: '#00ffff' };
  }

  dispose() {
    this.objects.forEach(obj => { this.scene.remove(obj); obj.geometry.dispose(); obj.material.dispose(); });
  }
}
