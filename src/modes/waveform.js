import * as THREE from 'three';

export class WaveformMode {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
    this.sensitivity = 2.0;
    this.init();
  }

  setSensitivity(val) {
    this.sensitivity = val;
  }

  init() {
    const segments = 512;
    
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(segments * 3);
    const colors = new Float32Array(segments * 3);
    
    for (let i = 0; i < segments; i++) {
      positions[i * 3] = (i / segments - 0.5) * 14;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 0;
      colors[i * 3 + 2] = 0;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    this.mainWave = new THREE.Line(geometry, new THREE.LineBasicMaterial({ vertexColors: true }));
    this.scene.add(this.mainWave);
    this.objects.push(this.mainWave);
    
    this.mirrorWave = new THREE.Line(geometry.clone(), new THREE.LineBasicMaterial({ vertexColors: true }));
    this.mirrorWave.scale.y = -1;
    this.scene.add(this.mirrorWave);
    this.objects.push(this.mirrorWave);
    
    this.trails = [];
    for (let t = 0; t < 15; t++) {
      const trail = new THREE.Line(
        geometry.clone(),
        new THREE.LineBasicMaterial({ 
          vertexColors: true, 
          transparent: true, 
          opacity: (1 - t/15) * 0.3 
        })
      );
      trail.position.z = -t * 0.2;
      this.scene.add(trail);
      this.trails.push(trail);
      this.objects.push(trail);
      
      const mirrorTrail = new THREE.Line(
        geometry.clone(),
        new THREE.LineBasicMaterial({ 
          vertexColors: true, 
          transparent: true, 
          opacity: (1 - t/15) * 0.3 
        })
      );
      mirrorTrail.scale.y = -1;
      mirrorTrail.position.z = -t * 0.2;
      this.scene.add(mirrorTrail);
      this.trails.push(mirrorTrail);
      this.objects.push(mirrorTrail);
    }
  }

  update(audioData) {
    const { waveform, bass, volume, animSpeed = 1, trailLength = 1 } = audioData;
    if (!waveform) return;
    
    // Trail length affects opacity and how many trails are visible
    const trailOpacityScale = trailLength;
    
    for (let t = this.trails.length - 1; t >= 2; t--) {
      const curr = this.trails[t].geometry.attributes.position.array;
      const prev = this.trails[t - 2].geometry.attributes.position.array;
      for (let i = 0; i < curr.length; i++) curr[i] = prev[i];
      this.trails[t].geometry.attributes.position.needsUpdate = true;
      // Adjust trail opacity based on trailLength setting
      const baseOpacity = (1 - (t/2) / (this.trails.length/2)) * 0.3;
      this.trails[t].material.opacity = baseOpacity * trailOpacityScale;
    }
    
    [this.mainWave, this.mirrorWave].forEach(wave => {
      const pos = wave.geometry.attributes.position.array;
      const col = wave.geometry.attributes.color.array;
      const segments = pos.length / 3;
      const step = Math.floor(waveform.length / segments);
      
      for (let i = 0; i < segments; i++) {
        const val = ((waveform[i * step] / 128) - 1) * this.sensitivity;
        pos[i * 3 + 1] = val * (1 + bass * 3);
        
        const t = Math.abs(val) * 2;
        col[i * 3] = 1;
        col[i * 3 + 1] = t;
        col[i * 3 + 2] = 0;
      }
      wave.geometry.attributes.position.needsUpdate = true;
      wave.geometry.attributes.color.needsUpdate = true;
    });
    
    if (this.trails.length > 1) {
      const mainPos = this.mainWave.geometry.attributes.position.array;
      this.trails[0].geometry.attributes.position.array.set(mainPos);
      this.trails[1].geometry.attributes.position.array.set(mainPos);
      this.trails[0].geometry.attributes.position.needsUpdate = true;
      this.trails[1].geometry.attributes.position.needsUpdate = true;
    }
    
    return { shake: bass * 0.15, bloomBoost: volume, color: '#ff0000' };
  }

  dispose() {
    this.objects.forEach(obj => {
      this.scene.remove(obj);
      obj.geometry.dispose();
      obj.material.dispose();
    });
  }
}
