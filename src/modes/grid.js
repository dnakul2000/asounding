import * as THREE from 'three';

export class GridMode {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
    this.sensitivity = 2.0;
    this.time = 0;
    this.init();
  }

  setSensitivity(val) { this.sensitivity = val; }

  init() {
    const size = 30, segments = 60;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    this.originalPositions = geometry.attributes.position.array.slice();
    this.terrain = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true, transparent: true, opacity: 0.8 }));
    this.terrain.rotation.x = -Math.PI / 2.5;
    this.terrain.position.y = -2;
    this.terrain.position.z = -5;
    this.scene.add(this.terrain);
    this.objects.push(this.terrain);
    
    const horizonGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-20, 0, -15), new THREE.Vector3(20, 0, -15)]);
    this.horizon = new THREE.Line(horizonGeo, new THREE.LineBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.8 }));
    this.scene.add(this.horizon);
    this.objects.push(this.horizon);
    
    this.sun = new THREE.Mesh(new THREE.CircleGeometry(2, 32), new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.9 }));
    this.sun.position.set(0, 3, -14);
    this.scene.add(this.sun);
    this.objects.push(this.sun);
    
    // Sun glow rings
    this.sunGlows = [];
    for (let i = 0; i < 4; i++) {
      const glow = new THREE.Mesh(
        new THREE.RingGeometry(2.2 + i * 0.4, 2.4 + i * 0.4, 32),
        new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.3 - i * 0.06, side: THREE.DoubleSide })
      );
      glow.position.set(0, 3, -14.1 - i * 0.01);
      this.scene.add(glow);
      this.sunGlows.push(glow);
      this.objects.push(glow);
    }
    
    // Horizontal scan lines (retro effect)
    this.scanLines = [];
    for (let i = 0; i < 5; i++) {
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-25, -14 + i * 0.3, -14.05),
        new THREE.Vector3(25, -14 + i * 0.3, -14.05)
      ]);
      const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.2 }));
      this.scene.add(line);
      this.scanLines.push(line);
      this.objects.push(line);
    }
    
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(300 * 3);
    for (let i = 0; i < 300; i++) { starPositions[i * 3] = (Math.random() - 0.5) * 40; starPositions[i * 3 + 1] = Math.random() * 10 + 2; starPositions[i * 3 + 2] = -10 - Math.random() * 5; }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true }));
    this.scene.add(this.stars);
    this.objects.push(this.stars);
  }

  update(audioData) {
    const { frequencies, bass, volume } = audioData;
    if (!frequencies) return;
    
    this.time += 0.05 + bass * 0.1;
    const positions = this.terrain.geometry.attributes.position.array;
    const vertCount = positions.length / 3;
    const gridSize = Math.sqrt(vertCount);
    
    for (let i = 0; i < vertCount; i++) {
      const x = i % gridSize, y = Math.floor(i / gridSize);
      const ox = this.originalPositions[i * 3], oy = this.originalPositions[i * 3 + 1];
      const freqIdx = Math.floor((x / gridSize) * frequencies.length);
      const freqVal = frequencies[freqIdx] / 255;
      const distFromCenter = Math.sqrt(ox * ox + oy * oy);
      const wave = Math.sin(distFromCenter * 0.5 - this.time) * 0.5;
      positions[i * 3 + 2] = (wave + freqVal * 3 + bass * 2) * this.sensitivity * 0.5;
    }
    this.terrain.geometry.attributes.position.needsUpdate = true;
    
    const hue = (this.time * 0.02) % 1;
    this.terrain.material.color.setHSL(hue, 1, 0.5);
    const sunScale = 1 + bass * 0.8;
    this.sun.scale.set(sunScale, sunScale, 1);
    this.sun.material.color.setHSL((hue + 0.1) % 1, 1, 0.5 + bass * 0.3);
    this.sun.material.opacity = 0.7 + bass * 0.3;
    
    // Animate sun glow rings
    this.sunGlows.forEach((glow, i) => {
      const glowScale = sunScale + bass * (i + 1) * 0.3;
      glow.scale.set(glowScale, glowScale, 1);
      glow.material.opacity = (0.3 - i * 0.06) + bass * 0.2;
      glow.material.color.setHSL((hue + 0.1 + i * 0.02) % 1, 1, 0.5);
    });
    
    // Animate scan lines
    this.scanLines.forEach((line, i) => {
      line.position.y = 1 + ((this.time * 0.5 + i * 0.2) % 3);
      line.material.opacity = 0.1 + bass * 0.3;
    });
    
    // Horizon glow on bass
    this.horizon.material.opacity = 0.5 + bass * 0.5;
    this.horizon.material.color.setHSL((hue + 0.5) % 1, 1, 0.5);
    
    this.stars.material.opacity = 0.3 + Math.sin(this.time * 2) * 0.2 + volume * 0.3;
    this.terrain.position.z = -5 + Math.sin(this.time * 0.2) * 2;
    
    return { shake: bass * 0.05, bloomBoost: volume * 1.2, color: '#00ff00' };
  }

  dispose() {
    this.objects.forEach(obj => { this.scene.remove(obj); obj.geometry.dispose(); obj.material.dispose(); });
  }
}
