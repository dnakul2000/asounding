import * as THREE from 'three';

export class TunnelMode {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
    this.time = 0;
    this.init();
  }

  init() {
    this.rings = [];
    const ringCount = 30;
    
    for (let i = 0; i < ringCount; i++) {
      const geometry = new THREE.RingGeometry(1.5, 2, 32);
      const material = new THREE.MeshBasicMaterial({
        color: 0xff00ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
        wireframe: true
      });
      
      const ring = new THREE.Mesh(geometry, material);
      ring.position.z = -i * 2;
      ring.userData.baseZ = -i * 2;
      
      this.scene.add(ring);
      this.rings.push(ring);
      this.objects.push(ring);
    }
    
    // Center line particles
    const lineGeo = new THREE.BufferGeometry();
    const linePositions = new Float32Array(100 * 3);
    for (let i = 0; i < 100; i++) {
      linePositions[i * 3] = (Math.random() - 0.5) * 0.5;
      linePositions[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
      linePositions[i * 3 + 2] = -Math.random() * 60;
    }
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    
    this.lineParticles = new THREE.Points(lineGeo, new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      transparent: true,
      blending: THREE.AdditiveBlending
    }));
    this.scene.add(this.lineParticles);
    this.objects.push(this.lineParticles);
  }

  update(audioData) {
    const { waveform, bass, volume, mids } = audioData;
    if (!waveform) return;
    
    this.time += 0.1 + bass * 0.3;
    const speed = 0.2 + bass * 0.5;
    
    this.rings.forEach((ring, i) => {
      // Move toward camera
      ring.position.z += speed;
      
      // Reset when past camera
      if (ring.position.z > 5) {
        ring.position.z = -55;
      }
      
      // Scale based on audio
      const waveIdx = Math.floor((i / this.rings.length) * waveform.length);
      const waveVal = (waveform[waveIdx] / 128 - 1) * 0.5;
      const scale = 1 + waveVal + bass * 0.5;
      ring.scale.set(scale, scale, 1);
      
      // Rotate
      ring.rotation.z += 0.01 + mids * 0.05;
      
      // Color shift
      const hue = (i / this.rings.length + this.time * 0.01) % 1;
      ring.material.color.setHSL(hue, 1, 0.5);
      ring.material.opacity = 0.3 + volume * 0.4;
    });
    
    // Move line particles
    const linePos = this.lineParticles.geometry.attributes.position.array;
    for (let i = 0; i < linePos.length / 3; i++) {
      linePos[i * 3 + 2] += speed * 2;
      if (linePos[i * 3 + 2] > 5) {
        linePos[i * 3 + 2] = -60;
        linePos[i * 3] = (Math.random() - 0.5) * 0.5;
        linePos[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
      }
    }
    this.lineParticles.geometry.attributes.position.needsUpdate = true;
    
    return { shake: bass * 0.1, bloomBoost: volume * 1.5 };
  }

  dispose() {
    this.objects.forEach(obj => {
      this.scene.remove(obj);
      obj.geometry.dispose();
      obj.material.dispose();
    });
  }
}
