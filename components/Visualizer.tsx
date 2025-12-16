import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  isPlaying: boolean;
  analyser: AnalyserNode | null;
}

const Visualizer: React.FC<VisualizerProps> = ({ isPlaying, analyser }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const bufferLength = analyser ? analyser.frequencyBinCount : 0;
    const dataArray = analyser ? new Uint8Array(bufferLength) : new Uint8Array(0);

    const draw = () => {
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
      } else {
        // Clear or show flat line if paused/no analyser
        // We will fallback to small idle animation below
      }

      // We want about 24 bars to match the design
      const barCount = 24;
      const barSpacing = 4;
      const totalSpacing = (barCount - 1) * barSpacing;
      const barWidth = (width - totalSpacing) / barCount;

      // Create gradient
      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, '#ec4899'); // Pink-500
      gradient.addColorStop(0.5, '#a855f7'); // Purple-500
      gradient.addColorStop(1, '#6366f1'); // Indigo-500
      ctx.fillStyle = gradient;

      for (let i = 0; i < barCount; i++) {
        let barHeight = 4; // Min height

        if (analyser && isPlaying) {
          // Map the few frequency bins to our bars
          // We have 32 bins (fftSize 64), mapping to 24 bars.
          // We skip the very first low frequencies as they are often DC offset or too strong
          const index = Math.floor((i / barCount) * (bufferLength * 0.7)); 
          const value = dataArray[index] || 0;
          
          // Scale value (0-255) to height
          const percent = value / 255;
          barHeight = Math.max(4, percent * height);
        } else {
            // Idle animation
            const time = Date.now() / 200;
            const offset = i * 0.5;
            // Gentle wave
            const wave = Math.sin(time + offset); 
            barHeight = 4 + (wave + 1) * 3; 
        }

        const x = i * (barWidth + barSpacing);
        const y = height - barHeight;

        // Rounded top caps (simulated by drawing a path)
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 4); // 4px radius
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
      className="w-full h-16 opacity-90"
      style={{ width: '100%', height: '64px' }}
    />
  );
};

export default Visualizer;