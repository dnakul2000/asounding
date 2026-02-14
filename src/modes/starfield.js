import * as THREE from 'three';

export class StarfieldMode {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
    this.sensitivity = 2.0;
    this.time = 0;
    this.lastBass = 0;
    this.hyperspaceProgress = 0;
    this.init();
  }

  setSensitivity(val) { this.sensitivity = val; }

  hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) { r = g = b = l; } else {
      const hue2rgb = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1/6) return p + (q - p) * 6 * t; if (t < 1/2) return q; if (t < 2/3) return p + (q - p) * (2/3 - t) * 6; return p; };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s; const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1/3);
    }
    return { r, g, b };
  }

  init() {
    const starCount = 3000;
    const geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(starCount * 3);
    this.velocities = new Float32Array(starCount);
    this.colors = new Float32Array(starCount * 3);
    this.baseColors = new Float32Array(starCount * 3);
    this.sizes = new Float32Array(starCount);
    this.starTypes = new Float32Array(starCount); // 0-1 for star type (color temp)
    
    for (let i = 0; i < starCount; i++) this.resetStar(i, true);
    
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    
    this.stars = new THREE.Points(geometry, new THREE.PointsMaterial({ 
      size: 0.12, 
      vertexColors: true, 
      transparent: true, 
      opacity: 0.95, 
      blending: THREE.AdditiveBlending, 
      sizeAttenuation: true 
    }));
    this.scene.add(this.stars);
    this.objects.push(this.stars);
    
    // Star trails (motion blur simulation)
    this.trailGeometry = new THREE.BufferGeometry();
    this.trailPositions = new Float32Array(starCount * 6); // 2 points per line
    this.trailColors = new Float32Array(starCount * 6);
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3));
    
    this.starTrails = new THREE.LineSegments(this.trailGeometry, new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending
    }));
    this.scene.add(this.starTrails);
    this.objects.push(this.starTrails);
    
    // Nebulae as large soft sprites with better colors
    this.nebulae = [];
    const nebulaColors = [
      { h: 0.75, s: 0.8, l: 0.3 }, // Purple
      { h: 0.55, s: 0.9, l: 0.35 }, // Cyan
      { h: 0.95, s: 0.7, l: 0.35 }, // Pink/magenta
      { h: 0.6, s: 0.6, l: 0.25 }, // Blue
      { h: 0.45, s: 0.7, l: 0.3 }, // Teal
      { h: 0.85, s: 0.5, l: 0.3 }, // Violet
    ];
    
    for (let i = 0; i < 8; i++) {
      const colorData = nebulaColors[i % nebulaColors.length];
      
      // Main nebula cloud (multiple overlapping spheres for soft look)
      const nebulaGroup = new THREE.Group();
      
      for (let j = 0; j < 4; j++) {
        const size = 5 + Math.random() * 8;
        const nebula = new THREE.Mesh(
          new THREE.IcosahedronGeometry(size, 2),
          new THREE.MeshBasicMaterial({ 
            color: new THREE.Color().setHSL(colorData.h + Math.random() * 0.1, colorData.s, colorData.l),
            transparent: true, 
            opacity: 0.025 + Math.random() * 0.02,
            side: THREE.BackSide,
            depthWrite: false
          })
        );
        nebula.position.set(
          (Math.random() - 0.5) * size * 0.5,
          (Math.random() - 0.5) * size * 0.5,
          (Math.random() - 0.5) * size * 0.3
        );
        nebula.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        nebulaGroup.add(nebula);
      }
      
      nebulaGroup.position.set(
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 25,
        -25 - Math.random() * 35
      );
      nebulaGroup.userData = { 
        basePosition: nebulaGroup.position.clone(),
        rotSpeed: (Math.random() - 0.5) * 0.001,
        colorData
      };
      
      this.scene.add(nebulaGroup);
      this.nebulae.push(nebulaGroup);
      this.objects.push(nebulaGroup);
    }
    
    // Distant sun/star with corona
    const sunGroup = new THREE.Group();
    
    // Core
    this.sunCore = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 32, 32), 
      new THREE.MeshBasicMaterial({ color: 0xffffcc, transparent: true, opacity: 1 })
    );
    sunGroup.add(this.sunCore);
    
    // Corona layers
    this.coronaLayers = [];
    for (let i = 0; i < 4; i++) {
      const corona = new THREE.Mesh(
        new THREE.SphereGeometry(2 + i * 0.8, 32, 32),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(0.1 - i * 0.02, 1, 0.5),
          transparent: true,
          opacity: 0.15 - i * 0.03,
          side: THREE.BackSide
        })
      );
      sunGroup.add(corona);
      this.coronaLayers.push(corona);
    }
    
    sunGroup.position.set(12, 6, -45);
    this.scene.add(sunGroup);
    this.sun = sunGroup;
    this.objects.push(sunGroup);
    
    // Dust particles (smaller, dimmer, more numerous)
    const dustCount = 1500;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    const dustColors = new Float32Array(dustCount * 3);
    
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 40;
      dustPos[i * 3 + 1] = (Math.random() - 0.5) * 40;
      dustPos[i * 3 + 2] = -Math.random() * 60;
      
      // Warm dust tint
      const warmth = Math.random();
      dustColors[i * 3] = 0.3 + warmth * 0.2;
      dustColors[i * 3 + 1] = 0.25 + warmth * 0.1;
      dustColors[i * 3 + 2] = 0.2;
    }
    
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    dustGeo.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));
    
    this.dustParticles = new THREE.Points(dustGeo, new THREE.PointsMaterial({
      size: 0.03,
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    }));
    this.scene.add(this.dustParticles);
    this.objects.push(this.dustParticles);
    
    // Milky Way band (stretched ellipsoid)
    const milkyWay = new THREE.Mesh(
      new THREE.SphereGeometry(50, 32, 16),
      new THREE.MeshBasicMaterial({
        color: 0x8888aa,
        transparent: true,
        opacity: 0.02,
        side: THREE.BackSide
      })
    );
    milkyWay.scale.set(1, 0.15, 1);
    milkyWay.rotation.x = Math.PI * 0.1;
    milkyWay.rotation.z = Math.PI * 0.15;
    milkyWay.position.z = -30;
    this.scene.add(milkyWay);
    this.milkyWay = milkyWay;
    this.objects.push(milkyWay);
  }

  resetStar(i, initial = false) {
    this.positions[i * 3] = (Math.random() - 0.5) * 35;
    this.positions[i * 3 + 1] = (Math.random() - 0.5) * 35;
    this.positions[i * 3 + 2] = initial ? -Math.random() * 55 : -55;
    this.velocities[i] = 0.08 + Math.random() * 0.25;
    
    // Star classification colors (realistic)
    // O (blue) -> B -> A -> F -> G (yellow) -> K (orange) -> M (red)
    this.starTypes[i] = Math.random();
    const type = this.starTypes[i];
    let hue, sat, light;
    
    if (type < 0.1) { // O/B - blue
      hue = 0.6; sat = 0.5; light = 0.85;
    } else if (type < 0.3) { // A - white-blue
      hue = 0.58; sat = 0.2; light = 0.9;
    } else if (type < 0.5) { // F - white
      hue = 0.15; sat = 0.1; light = 0.9;
    } else if (type < 0.7) { // G - yellow (like sun)
      hue = 0.12; sat = 0.5; light = 0.8;
    } else if (type < 0.85) { // K - orange
      hue = 0.08; sat = 0.7; light = 0.7;
    } else { // M - red
      hue = 0.02; sat = 0.8; light = 0.6;
    }
    
    const rgb = this.hslToRgb(hue, sat, light);
    this.baseColors[i * 3] = rgb.r;
    this.baseColors[i * 3 + 1] = rgb.g;
    this.baseColors[i * 3 + 2] = rgb.b;
    this.colors[i * 3] = rgb.r;
    this.colors[i * 3 + 1] = rgb.g;
    this.colors[i * 3 + 2] = rgb.b;
    
    // Size based on brightness (blue stars are larger)
    this.sizes[i] = 0.05 + (1 - type) * 0.15;
  }

  update(audioData) {
    const { bass, volume, mids, highs, onBeat, animSpeed = 1, particleDensity = 1 } = audioData;
    
    this.time += 0.016 * animSpeed;
    
    // Hyperspace detection (big drop = hyperspace jump)
    if (onBeat && bass > 0.7 && this.lastBass < 0.4) {
      this.hyperspaceProgress = 1.0;
    }
    this.lastBass = bass;
    
    // Decay hyperspace effect
    this.hyperspaceProgress *= 0.95;
    
    const speedMultiplier = (1 + bass * 6 + this.hyperspaceProgress * 10) * this.sensitivity * 0.5 * animSpeed;
    const densityScale = 0.5 + particleDensity * 0.5;
    
    const positions = this.stars.geometry.attributes.position.array;
    const colors = this.stars.geometry.attributes.color.array;
    const starCount = positions.length / 3;
    
    const trailPositions = this.trailPositions;
    const trailColors = this.trailColors;
    
    for (let i = 0; i < starCount; i++) {
      const prevZ = positions[i * 3 + 2];
      positions[i * 3 + 2] += this.velocities[i] * speedMultiplier;
      
      if (positions[i * 3 + 2] > 5) this.resetStar(i);
      
      const z = positions[i * 3 + 2];
      const brightness = Math.max(0, 1 - Math.abs(z) / 55);
      
      // Brighter on beats
      const beatBoost = onBeat && bass > 0.5 ? 1.5 : 1;
      
      // Hyperspace stretches star colors
      const hyperBoost = 1 + this.hyperspaceProgress * 2;
      
      colors[i * 3] = Math.min(1, this.baseColors[i * 3] * brightness * beatBoost * hyperBoost);
      colors[i * 3 + 1] = Math.min(1, this.baseColors[i * 3 + 1] * brightness * beatBoost);
      colors[i * 3 + 2] = Math.min(1, this.baseColors[i * 3 + 2] * brightness * beatBoost);
      
      // Trail positions (current and previous)
      const trailLength = speedMultiplier * 0.5 + this.hyperspaceProgress * 2;
      trailPositions[i * 6] = positions[i * 3];
      trailPositions[i * 6 + 1] = positions[i * 3 + 1];
      trailPositions[i * 6 + 2] = positions[i * 3 + 2];
      trailPositions[i * 6 + 3] = positions[i * 3];
      trailPositions[i * 6 + 4] = positions[i * 3 + 1];
      trailPositions[i * 6 + 5] = positions[i * 3 + 2] - trailLength;
      
      // Trail colors (fade at tail)
      trailColors[i * 6] = colors[i * 3];
      trailColors[i * 6 + 1] = colors[i * 3 + 1];
      trailColors[i * 6 + 2] = colors[i * 3 + 2];
      trailColors[i * 6 + 3] = colors[i * 3] * 0.1;
      trailColors[i * 6 + 4] = colors[i * 3 + 1] * 0.1;
      trailColors[i * 6 + 5] = colors[i * 3 + 2] * 0.1;
    }
    
    this.stars.geometry.attributes.position.needsUpdate = true;
    this.stars.geometry.attributes.color.needsUpdate = true;
    this.stars.material.size = (0.1 + bass * 0.2 + this.hyperspaceProgress * 0.3) * densityScale;
    
    this.trailGeometry.attributes.position.needsUpdate = true;
    this.trailGeometry.attributes.color.needsUpdate = true;
    this.starTrails.material.opacity = 0.15 + bass * 0.3 + this.hyperspaceProgress * 0.4;
    
    // Update nebulae
    this.nebulae.forEach((nebulaGroup, i) => {
      // Move forward
      nebulaGroup.position.z += 0.03 * speedMultiplier;
      
      if (nebulaGroup.position.z > 5) {
        nebulaGroup.position.z = -60;
        nebulaGroup.position.x = (Math.random() - 0.5) * 30;
        nebulaGroup.position.y = (Math.random() - 0.5) * 25;
      }
      
      // Gentle rotation
      nebulaGroup.rotation.z += nebulaGroup.userData.rotSpeed;
      
      // Pulse opacity with audio
      nebulaGroup.children.forEach((child, j) => {
        child.material.opacity = 0.02 + volume * 0.04 + bass * 0.02;
      });
    });
    
    // Sun corona pulse
    const sunScale = 1 + mids * 0.4 + bass * 0.3;
    this.sunCore.scale.setScalar(sunScale);
    this.sunCore.material.opacity = 0.8 + bass * 0.2;
    
    this.coronaLayers.forEach((corona, i) => {
      const layerScale = sunScale * (1.3 + i * 0.4 + bass * 0.2);
      corona.scale.setScalar(layerScale);
      corona.material.opacity = (0.12 - i * 0.025) + bass * 0.05;
    });
    
    // Dust particles
    const dustPos = this.dustParticles.geometry.attributes.position.array;
    for (let i = 0; i < dustPos.length / 3; i++) {
      dustPos[i * 3 + 2] += 0.02 * speedMultiplier;
      if (dustPos[i * 3 + 2] > 5) {
        dustPos[i * 3 + 2] = -60;
        dustPos[i * 3] = (Math.random() - 0.5) * 40;
        dustPos[i * 3 + 1] = (Math.random() - 0.5) * 40;
      }
    }
    this.dustParticles.geometry.attributes.position.needsUpdate = true;
    this.dustParticles.material.opacity = 0.2 + highs * 0.3;
    
    // Milky way subtle pulse
    this.milkyWay.material.opacity = 0.015 + volume * 0.02;
    
    return { 
      shake: bass * 0.03 + this.hyperspaceProgress * 0.1, 
      bloomBoost: volume * 2.5 + this.hyperspaceProgress * 2, 
      color: '#aaccff' 
    };
  }

  dispose() {
    this.objects.forEach(obj => { 
      this.scene.remove(obj); 
      if (obj.geometry) obj.geometry.dispose(); 
      if (obj.material) obj.material.dispose();
      // Handle groups
      if (obj.children) {
        obj.children.forEach(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
      }
    });
  }
}
