import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  isPlaying: boolean;
  analyser: AnalyserNode | null;
}

const Visualizer: React.FC<VisualizerProps> = React.memo(({ isPlaying, analyser }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true }); // Alpha true for transparency
    if (!ctx) return;

    // Handle high DPI displays optimally
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Only resize if dimensions actually changed to avoid expensive layout thrashing
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
    }

    const bufferLength = analyser ? analyser.frequencyBinCount : 0;
    const dataArray = analyser ? new Uint8Array(bufferLength) : new Uint8Array(0);

    // Pre-calculate gradient to avoid doing it every frame
    let gradient: CanvasGradient | null = null;

    const draw = () => {
      // If not playing and no analyser, stop drawing to save battery/CPU
      if (!isPlaying && !analyser) {
        ctx.clearRect(0, 0, rect.width, rect.height);
        return; 
      }

      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
      }

      // Create gradient once
      if (!gradient) {
        gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, '#ec4899'); // Pink
        gradient.addColorStop(0.5, '#a855f7'); // Purple
        gradient.addColorStop(1, '#6366f1'); // Indigo
      }
      ctx.fillStyle = gradient;

      const barCount = 24;
      const barSpacing = 4;
      const totalSpacing = (barCount - 1) * barSpacing;
      const barWidth = (width - totalSpacing) / barCount;

      for (let i = 0; i < barCount; i++) {
        let barHeight = 4;

        if (analyser && isPlaying) {
          const index = Math.floor((i / barCount) * (bufferLength * 0.7)); 
          const value = dataArray[index] || 0;
          const percent = value / 255;
          // Smooth scaling
          barHeight = Math.max(4, percent * height);
        } else {
            // Idle animation - optimized math
            const time = Date.now() / 250;
            const offset = i * 0.4;
            barHeight = 4 + (Math.sin(time + offset) + 1) * 3; 
        }

        const x = i * (barWidth + barSpacing);
        const y = height - barHeight;

        ctx.beginPath();
        // Use rect instead of roundRect on older devices if needed, but roundRect is standard now.
        // If performance is critical, rect is faster. Keeping roundRect for aesthetics.
        if (ctx.roundRect) {
            ctx.roundRect(x, y, barWidth, barHeight, 4);
        } else {
            ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, analyser]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-16 opacity-90 block transform-gpu" // Force GPU layer
      style={{ width: '100%', height: '64px' }}
    />
  );
});

export default Visualizer;