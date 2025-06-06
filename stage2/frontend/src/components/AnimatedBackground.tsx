import React, { useRef, useEffect } from 'react';

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    let mouse = { x: width / 2, y: height / 2, active: false };
    const circles = Array.from({ length: 18 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 30 + Math.random() * 40,
      baseR: 30 + Math.random() * 40,
      dx: (Math.random() - 0.5) * 0.7,
      dy: (Math.random() - 0.5) * 0.7,
      color: `hsl(${Math.random() * 360}, 80%, 70%)`,
      alpha: 0.13 + Math.random() * 0.07,
      pulse: Math.random() * Math.PI * 2,
    }));
    function splash(x: number, y: number) {
      for (const c of circles) {
        const dist = Math.hypot(c.x - x, c.y - y);
        if (dist < 180) {
          c.dx += (c.x - x) / dist * 1.5 * Math.random();
          c.dy += (c.y - y) / dist * 1.5 * Math.random();
        }
      }
    }
    function handleMove(e: MouseEvent | TouchEvent) {
      let x, y;
      if ('touches' in e) {
        x = e.touches[0].clientX;
        y = e.touches[0].clientY;
      } else {
        x = e.clientX;
        y = e.clientY;
      }
      mouse.x = x;
      mouse.y = y;
      mouse.active = true;
      splash(x, y);
    }
    function handleUp() {
      mouse.active = false;
    }
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      for (const c of circles) {
        c.pulse += 0.02 + Math.random() * 0.01;
        c.r = c.baseR + Math.sin(c.pulse) * 6;
        c.x += c.dx;
        c.y += c.dy;
        c.dx *= 0.98;
        c.dy *= 0.98;
        if (c.x < -c.r) c.x = width + c.r;
        if (c.x > width + c.r) c.x = -c.r;
        if (c.y < -c.r) c.y = height + c.r;
        if (c.y > height + c.r) c.y = -c.r;
        if (mouse.active) {
          const dist = Math.hypot(c.x - mouse.x, c.y - mouse.y);
          if (dist < 120) {
            c.dx += (c.x - mouse.x) / dist * 0.3;
            c.dy += (c.y - mouse.y) / dist * 0.3;
          }
        }
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, 2 * Math.PI);
        ctx.fillStyle = c.color.replace('hsl', 'hsla').replace(')', `,${c.alpha})`);
        ctx.shadowColor = c.color;
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      animationFrameId = requestAnimationFrame(render);
    };
    render();
    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        zIndex: 0,
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        transition: 'filter 0.5s',
        filter: 'blur(0.5px) saturate(1.2)',
      }}
    />
  );
} 