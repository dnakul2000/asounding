export const PRESETS = {
  default: {
    textSize: 1, textOpacity: 0.9, textReactivity: 1, textGlow: 0.5,
    textColor: '#ffffff', textOutline: false,
    colorPrimary: '#ff0000', colorSecondary: '#00ffff', colorBg: '#000000',
    saturation: 1, temperature: 0, colorCycle: false, cycleSpeed: 1,
    bloom: 1.5, glitch: 0, chromatic: 0.1, scanlines: 0.5, noise: 0.1,
    vignette: 0, shake: 1, beatFlash: false, invert: false, motionBlur: false,
    sensitivity: 2, animSpeed: 1, trailLength: 1, particleDensity: 1,
    zoomPulse: 0.5, sceneRotation: 0, mirrorX: false, mirrorY: false,
    autoCycle: true, autoCycleBeats: 16, autoCycleMode: 'smart'
  },
  neon: {
    textColor: '#00ffff', colorPrimary: '#ff00ff', colorSecondary: '#00ffff',
    colorBg: '#0a0012', bloom: 3, chromatic: 0.3, saturation: 1.5,
    textGlow: 1.5, glitch: 0.1
  },
  retro: {
    textColor: '#ff6600', colorPrimary: '#ff6600', colorSecondary: '#ffcc00',
    colorBg: '#1a0a00', scanlines: 1.5, noise: 0.3, chromatic: 0.2,
    bloom: 1, vignette: 0.5
  },
  minimal: {
    textColor: '#ffffff', colorPrimary: '#ffffff', colorSecondary: '#888888',
    colorBg: '#000000', bloom: 0.5, glitch: 0, chromatic: 0, scanlines: 0,
    noise: 0, textReactivity: 0.3, shake: 0.2
  },
  chaos: {
    bloom: 4, glitch: 0.5, chromatic: 0.6, shake: 2, beatFlash: true,
    colorCycle: true, cycleSpeed: 2, textReactivity: 3, zoomPulse: 2
  },
  chill: {
    textColor: '#88ccff', colorPrimary: '#4488ff', colorSecondary: '#88ffcc',
    colorBg: '#000811', bloom: 2, shake: 0.2, animSpeed: 0.5,
    textReactivity: 0.5, saturation: 0.8
  },
  rave: {
    colorCycle: true, cycleSpeed: 3, bloom: 3.5, beatFlash: true,
    glitch: 0.3, shake: 1.5, chromatic: 0.4, textReactivity: 2
  },
  vaporwave: {
    textColor: '#ff71ce', colorPrimary: '#ff71ce', colorSecondary: '#01cdfe',
    colorBg: '#150025', bloom: 2.5, scanlines: 0.8, chromatic: 0.15,
    saturation: 1.3, vignette: 0.3
  },
  matrix: {
    textColor: '#00ff00', colorPrimary: '#00ff00', colorSecondary: '#003300',
    colorBg: '#000500', scanlines: 1, noise: 0.2, bloom: 1.5,
    chromatic: 0.05
  },
  fire: {
    textColor: '#ff4400', colorPrimary: '#ff0000', colorSecondary: '#ffcc00',
    colorBg: '#0a0000', bloom: 2.5, shake: 1.2, temperature: 0.5,
    saturation: 1.4
  }
};

export function mergePreset(base, preset) {
  return { ...base, ...preset };
}
