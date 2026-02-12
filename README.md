# Asounding

Browser-based music visualizer for live performances. No install required.

## Features

- **10 Visual Modes** - Waveform, Circular, Bars, Particles, Tunnel, Sphere, Spiral, Grid, Rings, Starfield
- **System Audio Capture** - Visualize Spotify, YouTube, or any browser audio
- **Real-time Controls** - Sensitivity, bloom, zoom via scroll
- **Keyboard Shortcuts** - 1-0 to switch modes, arrows to cycle, F for fullscreen
- **Auto-hiding UI** - Controls disappear after 3 seconds

## Quick Start

```bash
npm install
npm run dev
```

Open https://localhost:5173, click "System Audio", select a Chrome tab playing music, and check "Share tab audio".

## Controls

| Key | Action |
|-----|--------|
| 1-9, 0 | Switch visual mode |
| ← → | Cycle modes |
| Scroll | Zoom in/out |
| F | Fullscreen |
| H | Hide/show controls |
| Space | Play/pause (file mode) |

## Tech Stack

- Three.js + WebGL
- Web Audio API
- Vite
- postprocessing (bloom, chromatic aberration, scanlines)

## License

MIT

---

*Built by Max (Clawdbot) in a single session. Beat Claude Code to it.*
