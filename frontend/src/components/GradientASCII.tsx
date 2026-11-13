import React, { useEffect, useRef } from 'react';

interface GradientASCIIProps {
  colors?: string[];
  shape?: 'horizon' | 'radial' | 'wave';
  characters?: string;
  cellSize?: number;
  density?: number;
  className?: string;
}

export const GradientASCII: React.FC<GradientASCIIProps> = ({
  colors = ['#1e3fd8', '#f6f8ff', '#a5d8ff', '#38bdf8'],
  shape = 'horizon',
  characters = ' =+xX0S8#@',
  cellSize = 18,
  density = 0.8,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Parse hex to RGB helper
    const hexToRgb = (hex: string) => {
      const clean = hex.replace('#', '');
      const bigint = parseInt(clean, 16);
      if (clean.length === 3) {
        const r = ((bigint >> 8) & 0xf) * 17;
        const g = ((bigint >> 4) & 0xf) * 17;
        const b = (bigint & 0xf) * 17;
        return [r, g, b];
      }
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return [r, g, b];
    };

    const rgbColors = colors.map(hexToRgb);

    const lerpColor = (t: number) => {
      const clamped = Math.max(0, Math.min(1, t));
      const n = rgbColors.length - 1;
      const i = Math.min(Math.floor(clamped * n), n - 1);
      const frac = clamped * n - i;
      const c1 = rgbColors[i];
      const c2 = rgbColors[i + 1] || rgbColors[i];
      const r = Math.round(c1[0] + (c2[0] - c1[0]) * frac);
      const g = Math.round(c1[1] + (c2[1] - c1[1]) * frac);
      const b = Math.round(c1[2] + (c2[2] - c1[2]) * frac);
      return `rgb(${r}, ${g}, ${b})`;
    };

    const render = () => {
      time += 0.015;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      const step = Math.max(8, cellSize);
      const cols = Math.ceil(width / step);
      const rows = Math.ceil(height / step);

      ctx.font = `${Math.floor(step * 0.9)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const charLen = characters.length;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * step + step / 2;
          const y = r * step + step / 2;

          const nx = c / cols;
          const ny = r / rows;

          let val = 0;
          if (shape === 'horizon') {
            // Horizon gradient waving with time
            val = ny + Math.sin(nx * 3.5 + time) * 0.15 * density;
          } else if (shape === 'radial') {
            const dx = nx - 0.5;
            const dy = ny - 0.5;
            const dist = Math.sqrt(dx * dx + dy * dy) * 1.5;
            val = 1 - dist + Math.sin(time + dist * 5) * 0.1 * density;
          } else {
            // wave
            val = (Math.sin(nx * 4 + time) + Math.cos(ny * 4 + time)) * 0.3 * density + 0.5;
          }

          val = Math.max(0, Math.min(1, val));
          const charIndex = Math.floor(val * (charLen - 1));
          const char = characters[charIndex] || ' ';

          if (char === ' ') continue;

          ctx.fillStyle = lerpColor(val);
          ctx.fillText(char, x, y);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [colors, shape, characters, cellSize, density]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full block ${className}`}
      style={{ display: 'block' }}
    />
  );
};

export default GradientASCII;
