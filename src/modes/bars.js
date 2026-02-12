import * as THREE from 'three';

export class BarsMode {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
    this.init();
  }

  init() {
    const barCount = 64;
    this.bars = [];
    this.barTargets = new Float32Array(barCount);
    
    for (let i = 0; i < barCount; i++) {
      const geometry = new THREE.BoxGeometry(0.15, 1, 0.15);
      const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const bar = new THREE.Mesh(geometry, material);
      
      bar.position.x = (i - barCount / 2) * 0.2;
      bar.position.y = 0;
      bar.scale.y = 0.01;
      
      this.scene.add(bar);
      this.bars.push(bar);
      this.objects.push(bar);
      
      // Mirror bar
      const mirrorBar = bar.clone();
      mirrorBar.material = material.clone();
      mirrorBar.position.y = 0;
      mirrorBar.scale.y = 0.01;
      mirrorBar.rotation.x = Math.PI;
      this.scene.add(mirrorBar);
      this.bars.push(mirrorBar);
      this.objects.push(mirrorBar);
    }
    
    // Floor reflection
    const floorGeo = new THREE.PlaneGeometry(20, 10);
    const floorMat = new THREE.MeshBasicMaterial({ 
      color: 0x000000, 
      transparent: true, 
      opacity: 0.3 
    });
    this.floor = new THREE.Mesh(floorGeo, floorMat);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -0.5;
    this.scene.add(this.floor);
    this.objects.push(this.floor);
  }

  update(audioData) {
    const { frequencies, bass, volume } = audioData;
    if (!frequencies) return;
    
    const barCount = this.bars.length / 2;
    const step = Math.floor(frequencies.length / barCount);
    
    for (let i = 0; i < barCount; i++) {
      // Average a few frequency bins
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += frequencies[i * step + j];
      }
      const value = (sum / step / 255) * 5;
      
      // Smooth animation
      this.barTargets[i] += (value - this.barTargets[i]) * 0.3;
      const height = Math.max(0.01, this.barTargets[i]);
      
      // Main bar
      const bar = this.bars[i * 2];
      bar.scale.y = height;
      bar.position.y = height / 2;
      
      // Color gradient based on height
      const hue = (i / barCount) * 0.3 + 0.3; // Green to yellow
      const saturation = 1;
      const lightness = 0.4 + height * 0.1;
      bar.material.color.setHSL(hue, saturation, lightness);
      
      // Mirror bar
      const mirror = this.bars[i * 2 + 1];
      mirror.scale.y = height * 0.5;
      mirror.position.y = -height * 0.25;
      mirror.material.color.setHSL(hue, saturation, lightness * 0.5);
    }
    
    return { shake: bass * 0.05, bloomBoost: volume * 0.8 };
  }

  dispose() {
    this.objects.forEach(obj => {
      this.scene.remove(obj);
      obj.geometry.dispose();
      obj.material.dispose();
    });
  }
}
