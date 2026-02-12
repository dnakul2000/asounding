import * as THREE from 'three';

export class BarsMode {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
    this.sensitivity = 2.0;
    this.init();
  }

  setSensitivity(val) { this.sensitivity = val; }

  init() {
    const barCount = 64;
    this.bars = [];
    this.barTargets = new Float32Array(barCount);
    
    for (let i = 0; i < barCount; i++) {
      const geometry = new THREE.BoxGeometry(0.15, 1, 0.15);
      const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const bar = new THREE.Mesh(geometry, material);
      bar.position.x = (i - barCount / 2) * 0.2;
      bar.scale.y = 0.01;
      this.scene.add(bar);
      this.bars.push(bar);
      this.objects.push(bar);
      
      const mirrorBar = bar.clone();
      mirrorBar.material = material.clone();
      mirrorBar.rotation.x = Math.PI;
      this.scene.add(mirrorBar);
      this.bars.push(mirrorBar);
      this.objects.push(mirrorBar);
    }
  }

  update(audioData) {
    const { frequencies, bass, volume } = audioData;
    if (!frequencies) return;
    
    const barCount = this.bars.length / 2;
    const step = Math.floor(frequencies.length / barCount);
    
    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) sum += frequencies[i * step + j];
      const value = (sum / step / 255) * this.sensitivity * 2.5;
      
      this.barTargets[i] += (value - this.barTargets[i]) * 0.3;
      const height = Math.max(0.01, this.barTargets[i]);
      
      const bar = this.bars[i * 2];
      bar.scale.y = height;
      bar.position.y = height / 2;
      
      const hue = (i / barCount) * 0.3 + 0.3;
      bar.material.color.setHSL(hue, 1, 0.4 + height * 0.1);
      
      const mirror = this.bars[i * 2 + 1];
      mirror.scale.y = height * 0.5;
      mirror.position.y = -height * 0.25;
      mirror.material.color.setHSL(hue, 1, 0.2 + height * 0.05);
    }
    
    return { shake: bass * 0.05, bloomBoost: volume * 0.8, color: '#00ff00' };
  }

  dispose() {
    this.objects.forEach(obj => {
      this.scene.remove(obj);
      obj.geometry.dispose();
      obj.material.dispose();
    });
  }
}
