/**
 * Smart Audio Analyzer - auto-calibration, energy detection, BPM sync
 */
export class SmartAudioAnalyzer {
  constructor() {
    // Calibration
    this.minVolume = 1;
    this.maxVolume = 0;
    this.calibrationSamples = 0;
    this.isCalibrated = false;
    
    // Energy detection
    this.energyHistory = [];
    this.energyWindowSize = 60; // ~1 second at 60fps
    this.currentEnergy = 0;
    this.averageEnergy = 0;
    this.energyState = 'normal'; // 'calm', 'normal', 'peak'
    
    // BPM detection
    this.beatHistory = [];
    this.lastBeatTime = 0;
    this.bpm = 120;
    this.beatConfidence = 0;
    this.onBeat = false;
    this.beatThreshold = 0.6;
    this.lastBassValue = 0;
    
    // Smoothed outputs
    this.smoothedIntensity = 0.5;
  }

  analyze(audioData) {
    const { bass, volume, mids, highs } = audioData;
    
    // Auto-calibration (first 3 seconds)
    this.calibrate(volume);
    
    // Normalize volume based on calibration
    const normalizedVolume = this.normalize(volume);
    
    // Energy detection
    this.detectEnergy(normalizedVolume, bass);
    
    // BPM detection
    this.detectBeat(bass);
    
    // Calculate overall intensity
    this.calculateIntensity(normalizedVolume, bass);
    
    return {
      // Original values
      ...audioData,
      
      // Normalized values
      normalizedVolume,
      normalizedBass: this.normalize(bass),
      
      // Smart values
      intensity: this.smoothedIntensity,
      energyState: this.energyState,
      energyLevel: this.currentEnergy / Math.max(this.averageEnergy, 0.01),
      
      // Beat sync
      bpm: this.bpm,
      onBeat: this.onBeat,
      beatConfidence: this.beatConfidence,
      
      // Calibration status
      isCalibrated: this.isCalibrated
    };
  }

  calibrate(volume) {
    if (this.calibrationSamples < 180) { // ~3 seconds
      this.minVolume = Math.min(this.minVolume, volume);
      this.maxVolume = Math.max(this.maxVolume, volume);
      this.calibrationSamples++;
      
      if (this.calibrationSamples >= 180) {
        this.isCalibrated = true;
        // Ensure reasonable range
        if (this.maxVolume - this.minVolume < 0.1) {
          this.minVolume = 0;
          this.maxVolume = 0.5;
        }
      }
    } else {
      // Continue adapting slowly
      this.minVolume = this.minVolume * 0.999 + volume * 0.001;
      this.maxVolume = this.maxVolume * 0.999 + Math.max(volume, this.maxVolume) * 0.001;
    }
  }

  normalize(value) {
    if (!this.isCalibrated) return value;
    const range = this.maxVolume - this.minVolume;
    if (range < 0.01) return value;
    return Math.max(0, Math.min(1, (value - this.minVolume) / range));
  }

  detectEnergy(volume, bass) {
    const energy = volume * 0.6 + bass * 0.4;
    
    this.energyHistory.push(energy);
    if (this.energyHistory.length > this.energyWindowSize) {
      this.energyHistory.shift();
    }
    
    this.currentEnergy = energy;
    this.averageEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
    
    // Determine energy state
    const ratio = energy / Math.max(this.averageEnergy, 0.01);
    if (ratio < 0.5) {
      this.energyState = 'calm';
    } else if (ratio > 1.5) {
      this.energyState = 'peak';
    } else {
      this.energyState = 'normal';
    }
  }

  detectBeat(bass) {
    const now = Date.now();
    this.onBeat = false;
    
    // Detect beat on bass spike
    if (bass > this.beatThreshold && this.lastBassValue <= this.beatThreshold) {
      const timeSinceLastBeat = now - this.lastBeatTime;
      
      if (timeSinceLastBeat > 200) { // Min 200ms between beats (300 BPM max)
        this.onBeat = true;
        
        // Calculate BPM from beat intervals
        this.beatHistory.push(timeSinceLastBeat);
        if (this.beatHistory.length > 8) {
          this.beatHistory.shift();
        }
        
        if (this.beatHistory.length >= 4) {
          const avgInterval = this.beatHistory.reduce((a, b) => a + b, 0) / this.beatHistory.length;
          const newBpm = 60000 / avgInterval;
          
          // Only update if BPM is reasonable (60-180)
          if (newBpm >= 60 && newBpm <= 180) {
            this.bpm = this.bpm * 0.8 + newBpm * 0.2; // Smooth
            this.beatConfidence = Math.min(1, this.beatHistory.length / 8);
          }
        }
        
        this.lastBeatTime = now;
      }
    }
    
    // Adaptive threshold
    this.beatThreshold = this.beatThreshold * 0.99 + bass * 0.5 * 0.01;
    this.beatThreshold = Math.max(0.3, Math.min(0.8, this.beatThreshold));
    
    this.lastBassValue = bass;
  }

  calculateIntensity(volume, bass) {
    let targetIntensity = 0.5;
    
    // Base intensity from volume
    targetIntensity = volume * 0.7 + 0.3;
    
    // Boost during peaks
    if (this.energyState === 'peak') {
      targetIntensity *= 1.3;
    } else if (this.energyState === 'calm') {
      targetIntensity *= 0.7;
    }
    
    // Beat boost
    if (this.onBeat) {
      targetIntensity = Math.min(1, targetIntensity + 0.2);
    }
    
    // Smooth
    this.smoothedIntensity += (targetIntensity - this.smoothedIntensity) * 0.1;
    this.smoothedIntensity = Math.max(0, Math.min(1, this.smoothedIntensity));
  }

  reset() {
    this.calibrationSamples = 0;
    this.isCalibrated = false;
    this.minVolume = 1;
    this.maxVolume = 0;
    this.energyHistory = [];
    this.beatHistory = [];
  }
}
