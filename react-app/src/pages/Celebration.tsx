import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { API_BASE, apiClient } from '../api/client';
import { AnimatedTextBar } from '../components/AnimatedTextBar';

export const Celebration = () => {
  const { progress, setProgress } = useAppContext();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const confettiRef = useRef<HTMLCanvasElement | null>(null);
  const confettiColors = useMemo(() => ['#ffd166', '#06d6a0', '#4cc9f0', '#f72585', '#ffc6ff'], []);

  const remaining = Math.max(progress.total - progress.processed, 0);
  const videoSrc = useMemo(() => {
    const filename = 'you_spin_me_round.mp4';
    return `${API_BASE}/celebration/${encodeURIComponent(filename)}`;
  }, []);
  const showCelebration = remaining === 0;

  useEffect(() => {
    if (remaining > 0) {
      navigate('/', { replace: true });
    }
  }, [remaining, navigate]);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const data = await apiClient.getProgress();
        setProgress({
          processed: data.processed_images,
          total: data.total_images,
          percentage: data.percentage,
        });
      } catch (err) {
        console.warn('[DEBUG] Celebration: Failed to refresh progress', err);
      }
    };

    fetchProgress();
    const interval = window.setInterval(fetchProgress, 5000);
    return () => window.clearInterval(interval);
  }, [setProgress]);

  useEffect(() => {
    if (remaining !== 0) {
      return;
    }

    const player = videoRef.current;
    if (!player) {
      return;
    }

    const attemptPlay = async () => {
      try {
        await player.play();
      } catch (err) {
        console.warn('[DEBUG] Celebration: Autoplay failed', err);
      }
    };

    if (player.readyState >= 2) {
      void attemptPlay();
      return;
    }

    const handleCanPlay = () => {
      player.removeEventListener('canplay', handleCanPlay);
      void attemptPlay();
    };

    player.addEventListener('canplay', handleCanPlay);
    return () => {
      player.removeEventListener('canplay', handleCanPlay);
    };
  }, [remaining]);

  useEffect(() => {
    if (!showCelebration) {
      return;
    }

    const canvas = confettiRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    const confettiCount = 160;
    const gravity = 0.35;
    const terminalVelocity = 5;
    const drag = 0.02;
    const colors = confettiColors;

    const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

    type ConfettiPiece = {
      color: string;
      dimensions: { x: number; y: number };
      position: { x: number; y: number };
      rotation: number;
      scale: { x: number; y: number };
      velocity: { x: number; y: number };
    };

    const initPiece = (): ConfettiPiece => ({
      color: colors[Math.floor(Math.random() * colors.length)],
      dimensions: { x: randomRange(8, 16), y: randomRange(12, 20) },
      position: {
        x: Math.random() * canvas.width,
        y: canvas.height + randomRange(0, canvas.height),
      },
      rotation: randomRange(0, 2 * Math.PI),
      scale: { x: 1, y: 1 },
      velocity: {
        x: randomRange(-15, 15),
        y: randomRange(-45, -25),
      },
    });

    const pieces: ConfettiPiece[] = Array.from({ length: confettiCount }, initPiece);

    let animationFrame = 0;

    const render = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);

      pieces.forEach(piece => {
        piece.velocity.x -= piece.velocity.x * drag;
        piece.velocity.y = Math.min(piece.velocity.y + gravity, terminalVelocity);
        piece.position.x += piece.velocity.x;
        piece.position.y += piece.velocity.y;
        piece.rotation += piece.velocity.x * 0.01;
        piece.scale.y = Math.cos(piece.position.y * 0.02);

        if (piece.position.y >= canvas.height) {
          Object.assign(piece, initPiece(), {
            position: { x: Math.random() * canvas.width, y: -20 },
          });
        }

        if (piece.position.x > canvas.width) {
          piece.position.x = 0;
        } else if (piece.position.x < 0) {
          piece.position.x = canvas.width;
        }

        context.save();
        context.translate(piece.position.x, piece.position.y);
        context.rotate(piece.rotation);
        context.scale(piece.scale.x, piece.scale.y);
        context.fillStyle = piece.color;
        context.fillRect(-piece.dimensions.x / 2, -piece.dimensions.y / 2, piece.dimensions.x, piece.dimensions.y);
        context.restore();
      });

      animationFrame = requestAnimationFrame(render);
    };

    animationFrame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
      context.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [showCelebration, confettiColors]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      {showCelebration && (
        <canvas
          ref={confettiRef}
          className="pointer-events-none absolute inset-0 z-999"
        />
      )}

      <div className="flex h-full w-full items-center justify-center">
        <video
          ref={videoRef}
          className="max-h-11/12 max-w-11/12 object-contain rounded-2xl m-10"
          controls
          
          autoPlay
          playsInline
          preload="auto"
        >
          <source src={videoSrc} type="video/mp4" />
          Sorry, your browser cannot play this video.
        </video>
      </div>

      {/* Scrolling text bar with color-changing background */}
      {showCelebration && (
        <AnimatedTextBar
          text="♪ Dead or Alive - You Spin Me Round (Like a Record) ♪"
          className="fixed bottom-0 left-0 right-0 z-30 h-20"
        />
      )}
    </div>


  );
};
