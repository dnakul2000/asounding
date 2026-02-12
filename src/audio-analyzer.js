/**
 * Smart Audio Analyzer - onset detection, spectral flux, BPM sync, instrument separation
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
    this.energyWindowSize = 60;
    this.currentEnergy = 0;
    this.averageEnergy = 0;
    this.energyState = 'normal';
    
    // Spectral flux (onset detection)
    this.prevSpectrum = null;
    this.spectralFluxHistory = [];
    this.spectralFluxThreshold = 0;
    this.onsetDetected = false;
    
    // BPM detection
    this.beatHistory = [];
    this.lastBeatTime = 0;
    this.bpm = 120;
    this.beatConfidence = 0;
    this.onBeat = false;
    this.beatThreshold = 0.6;
    this.lastBassValue = 0;
    
    // Beat phase tracking (for BPM-locked animations)
    this.beatPhase = 0;
    this.lastBeatPhaseTime = Date.now();
    
    // Instrument separation
    this.kickDetected = false;
    this.snareDetected = false;
    this.hihatDetected = false;
    this.prevKick = 0;
    this.prevSnare = 0;
    this.prevHihat = 0;
    
    // Frequency band history for transient detection
    this.bassHistory = [];
    this.midHistory = [];
    this.highHistory = [];
    this.historySize = 10;
    
    // Smoothed outputs
    this.smoothedIntensity = 0.5;
    this.smoothedBass = 0;
    this.smoothedMids = 0;
    this.smoothedHighs = 0;
  }

  analyze(audioData) {
    const { bass, volume, mids, highs, frequencies } = audioData;
    
    // Auto-calibration
    this.calibrate(volume);
    
    // Normalize
    const normalizedVolume = this.normalize(volume);
    const normalizedBass = this.normalize(bass);
    
    // Smooth values
    this.smoothedBass += (bass - this.smoothedBass) * 0.3;
    this.smoothedMids += (mids - this.smoothedMids) * 0.3;
    this.smoothedHighs += (highs - this.smoothedHighs) * 0.3;
    
    // Energy detection
    this.detectEnergy(normalizedVolume, bass);
    
    // Spectral flux onset detection
    if (frequencies) {
      this.detectOnset(frequencies);
    }
    
    // BPM detection
    this.detectBeat(bass);
    
    // Update beat phase
    this.updateBeatPhase();
    
    // Instrument separation
    this.detectInstruments(bass, mids, highs);
    
    // Calculate overall intensity
    this.calculateIntensity(normalizedVolume, bass);
    
    return {
      // Original values
      ...audioData,
      
      // Normalized values
      normalizedVolume,
      normalizedBass,
      
      // Smoothed values
      smoothedBass: this.smoothedBass,
      smoothedMids: this.smoothedMids,
      smoothedHighs: this.smoothedHighs,
      
      // Smart values
      intensity: this.smoothedIntensity,
      energyState: this.energyState,
      energyLevel: this.currentEnergy / Math.max(this.averageEnergy, 0.01),
      
      // Beat sync
      bpm: this.bpm,
      onBeat: this.onBeat,
      beatConfidence: this.beatConfidence,
      beatPhase: this.beatPhase,
      
      // Onset detection
      onsetDetected: this.onsetDetected,
      
      // Instrument separation
      kickDetected: this.kickDetected,
      snareDetected: this.snareDetected,
      hihatDetected: this.hihatDetected,
      
      // Calibration status
      isCalibrated: this.isCalibrated
    };
  }

  calibrate(volume) {
    if (this.calibrationSamples < 180) {
      this.minVolume = Math.min(this.minVolume, volume);
      this.maxVolume = Math.max(this.maxVolume, volume);
      this.calibrationSamples++;
      
      if (this.calibrationSamples >= 180) {
        this.isCalibrated = true;
        if (this.maxVolume - this.minVolume < 0.1) {
          this.minVolume = 0;
          this.maxVolume = 0.5;
        }
      }
    } else {
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
    
    const ratio = energy / Math.max(this.averageEnergy, 0.01);
    if (ratio < 0.5) {
      this.energyState = 'calm';
    } else if (ratio > 1.5) {
      this.energyState = 'peak';
    } else {
      this.energyState = 'normal';
    }
  }

  detectOnset(frequencies) {
    this.onsetDetected = false;
    
    // Calculate spectral flux
    if (this.prevSpectrum) {
      let flux = 0;
      const len = Math.min(frequencies.length, this.prevSpectrum.length);
      
      for (let i = 0; i < len; i++) {
        const diff = frequencies[i] - this.prevSpectrum[i];
        // Only count positive differences (increases in energy)
        if (diff > 0) {
          flux += diff;
        }
      }
      
      flux /= len;
      
      // Track flux history for adaptive threshold
      this.spectralFluxHistory.push(flux);
      if (this.spectralFluxHistory.length > 30) {
        this.spectralFluxHistory.shift();
      }
      
      // Calculate adaptive threshold
      const avgFlux = this.spectralFluxHistory.reduce((a, b) => a + b, 0) / this.spectralFluxHistory.length;
      this.spectralFluxThreshold = avgFlux * 1.5 + 5; // Adaptive with minimum
      
      // Detect onset if flux exceeds threshold
      if (flux > this.spectralFluxThreshold) {
        this.onsetDetected = true;
      }
    }
    
    // Store current spectrum for next frame
    this.prevSpectrum = new Uint8Array(frequencies);
  }

  detectBeat(bass) {
    const now = Date.now();
    this.onBeat = false;
    
    // Use both bass threshold and onset detection
    const bassRising = bass > this.beatThreshold && this.lastBassValue <= this.beatThreshold;
    const shouldTrigger = bassRising || (this.onsetDetected && bass > 0.4);
    
    if (shouldTrigger) {
      const timeSinceLastBeat = now - this.lastBeatTime;
      
      if (timeSinceLastBeat > 200) {
        this.onBeat = true;
        
        this.beatHistory.push(timeSinceLastBeat);
        if (this.beatHistory.length > 8) {
          this.beatHistory.shift();
        }
        
        if (this.beatHistory.length >= 4) {
          const avgInterval = this.beatHistory.reduce((a, b) => a + b, 0) / this.beatHistory.length;
          const newBpm = 60000 / avgInterval;
          
          if (newBpm >= 60 && newBpm <= 180) {
            this.bpm = this.bpm * 0.8 + newBpm * 0.2;
            this.beatConfidence = Math.min(1, this.beatHistory.length / 8);
          }
        }
        
        this.lastBeatTime = now;
        this.lastBeatPhaseTime = now;
        this.beatPhase = 0;
      }
    }
    
    // Adaptive threshold
    this.beatThreshold = this.beatThreshold * 0.99 + bass * 0.5 * 0.01;
    this.beatThreshold = Math.max(0.3, Math.min(0.8, this.beatThreshold));
    
    this.lastBassValue = bass;
  }

  updateBeatPhase() {
    // Calculate beat phase (0 to 1) based on detected BPM
    const now = Date.now();
    const beatDuration = 60000 / this.bpm;
    const elapsed = now - this.lastBeatPhaseTime;
    this.beatPhase = (elapsed % beatDuration) / beatDuration;
  }

  detectInstruments(bass, mids, highs) {
    // Track history
    this.bassHistory.push(bass);
    this.midHistory.push(mids);
    this.highHistory.push(highs);
    
    if (this.bassHistory.length > this.historySize) {
      this.bassHistory.shift();
      this.midHistory.shift();
      this.highHistory.shift();
    }
    
    // Calculate averages
    const avgBass = this.bassHistory.reduce((a, b) => a + b, 0) / this.bassHistory.length;
    const avgMid = this.midHistory.reduce((a, b) => a + b, 0) / this.midHistory.length;
    const avgHigh = this.highHistory.reduce((a, b) => a + b, 0) / this.highHistory.length;
    
    // Kick detection: strong bass transient, low mids
    this.kickDetected = false;
    if (bass > avgBass * 1.5 && bass > this.prevKick && mids < avgMid * 1.2) {
      this.kickDetected = true;
    }
    
    // Snare detection: mid-frequency transient with high content
    this.snareDetected = false;
    if (mids > avgMid * 1.4 && highs > avgHigh * 1.2 && mids > this.prevSnare) {
      this.snareDetected = true;
    }
    
    // Hi-hat detection: high frequency content without much bass
    this.hihatDetected = false;
    if (highs > avgHigh * 1.5 && highs > this.prevHihat && bass < avgBass * 1.2) {
      this.hihatDetected = true;
    }
    
    this.prevKick = bass;
    this.prevSnare = mids;
    this.prevHihat = highs;
  }

  calculateIntensity(volume, bass) {
    let targetIntensity = 0.5;
    
    targetIntensity = volume * 0.7 + 0.3;
    
    if (this.energyState === 'peak') {
      targetIntensity *= 1.3;
    } else if (this.energyState === 'calm') {
      targetIntensity *= 0.7;
    }
    
    if (this.onBeat) {
      targetIntensity = Math.min(1, targetIntensity + 0.2);
    }
    
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
    this.spectralFluxHistory = [];
    this.prevSpectrum = null;
    this.bassHistory = [];
    this.midHistory = [];
    this.highHistory = [];
  }
}
