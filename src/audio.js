/**
 * Audio Analyzer - handles Web Audio API setup and FFT analysis
 * Supports: microphone, screen capture (system audio), and file input
 */
export class AudioAnalyzer {
  constructor(fftSize = 2048) {
    this.fftSize = fftSize;
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.frequencyData = null;
    this.isInitialized = false;
    this.source = null;
    this.audioElement = null;
  }

  async initMicrophone() {
    return this._init(async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      return this.audioContext.createMediaStreamSource(stream);
    });
  }

  async initSystemAudio() {
    return this._init(async () => {
      // Request screen/window capture with audio
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true, // Required, but we won't use it
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      
      // Check if we got audio
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No audio track - make sure to check "Share audio" when selecting the screen/tab');
      }
      
      // Stop video track to save resources (we only need audio)
      stream.getVideoTracks().forEach(track => track.stop());
      
      return this.audioContext.createMediaStreamSource(stream);
    });
  }

  async initFile(file) {
    return this._init(async () => {
      // Create audio element for file playback
      this.audioElement = new Audio();
      this.audioElement.src = URL.createObjectURL(file);
      this.audioElement.loop = true;
      
      // Wait for audio to be ready
      await new Promise((resolve, reject) => {
        this.audioElement.oncanplaythrough = resolve;
        this.audioElement.onerror = reject;
      });
      
      await this.audioElement.play();
      return this.audioContext.createMediaElementSource(this.audioElement);
    });
  }

  async initUrl(url) {
    return this._init(async () => {
      this.audioElement = new Audio();
      this.audioElement.crossOrigin = 'anonymous';
      this.audioElement.src = url;
      this.audioElement.loop = true;
      
      await new Promise((resolve, reject) => {
        this.audioElement.oncanplaythrough = resolve;
        this.audioElement.onerror = reject;
      });
      
      await this.audioElement.play();
      return this.audioContext.createMediaElementSource(this.audioElement);
    });
  }

  async _init(createSource) {
    try {
      // Clean up previous source if any
      if (this.source) {
        this.source.disconnect();
      }

      // Create audio context if needed
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      // Resume context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Create analyzer if needed
      if (!this.analyser) {
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = this.fftSize;
        this.analyser.smoothingTimeConstant = 0.8;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      }

      // Create and connect source
      this.source = await createSource();
      this.source.connect(this.analyser);

      this.isInitialized = true;
      console.log('Audio initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      throw error;
    }
  }

  /**
   * Get time domain data (waveform)
   * @returns {Uint8Array} - Values 0-255, centered at 128
   */
  getWaveform() {
    if (!this.isInitialized) return null;
    this.analyser.getByteTimeDomainData(this.dataArray);
    return this.dataArray;
  }

  /**
   * Get frequency data
   * @returns {Uint8Array} - Values 0-255
   */
  getFrequencies() {
    if (!this.isInitialized) return null;
    this.analyser.getByteFrequencyData(this.frequencyData);
    return this.frequencyData;
  }

  /**
   * Get average volume level (0-1)
   */
  getVolume() {
    const frequencies = this.getFrequencies();
    if (!frequencies) return 0;
    
    let sum = 0;
    for (let i = 0; i < frequencies.length; i++) {
      sum += frequencies[i];
    }
    return sum / (frequencies.length * 255);
  }

  /**
   * Get bass level (0-1)
   */
  getBass() {
    const frequencies = this.getFrequencies();
    if (!frequencies) return 0;
    
    const bassEnd = Math.floor(frequencies.length * 0.1);
    let sum = 0;
    for (let i = 0; i < bassEnd; i++) {
      sum += frequencies[i];
    }
    return sum / (bassEnd * 255);
  }

  /**
   * Get mids level (0-1)
   */
  getMids() {
    const frequencies = this.getFrequencies();
    if (!frequencies) return 0;
    
    const midStart = Math.floor(frequencies.length * 0.1);
    const midEnd = Math.floor(frequencies.length * 0.5);
    let sum = 0;
    for (let i = midStart; i < midEnd; i++) {
      sum += frequencies[i];
    }
    return sum / ((midEnd - midStart) * 255);
  }

  /**
   * Get highs level (0-1)
   */
  getHighs() {
    const frequencies = this.getFrequencies();
    if (!frequencies) return 0;
    
    const highStart = Math.floor(frequencies.length * 0.5);
    let sum = 0;
    for (let i = highStart; i < frequencies.length; i++) {
      sum += frequencies[i];
    }
    return sum / ((frequencies.length - highStart) * 255);
  }

  // Playback controls for file/url mode
  play() {
    if (this.audioElement) this.audioElement.play();
  }

  pause() {
    if (this.audioElement) this.audioElement.pause();
  }

  setVolume(vol) {
    if (this.audioElement) this.audioElement.volume = vol;
  }

  dispose() {
    if (this.source) this.source.disconnect();
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.isInitialized = false;
  }
}
