import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { AnimatedTextBar } from './AnimatedTextBar';

export const ProgressBar = () => {
  const { progress } = useAppContext();
  const location = useLocation();
  const confettiColors = useMemo(() => ['#ffd166', '#06d6a0', '#4cc9f0', '#f72585', '#ffc6ff'], []);
  const [colorIndex, setColorIndex] = useState(0);
  const isComplete = progress.total > 0 && progress.processed >= progress.total;

  const percentage = progress.percentage || 0;

  useEffect(() => {
    if (!isComplete || confettiColors.length < 2) {
      setColorIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setColorIndex(current => (current + 1) % confettiColors.length);
    }, 900);

    return () => window.clearInterval(interval);
  }, [confettiColors, isComplete]);

  const nextColor = confettiColors[(colorIndex + 1) % confettiColors.length];
  const barStyle = {
    width: `${percentage}%`,
    background: isComplete
      ? `linear-gradient(120deg, ${confettiColors[colorIndex]}, ${nextColor})`
      : 'var(--rp-base0B)',
    transition: 'width 0.3s ease-out, background 0.8s ease-in-out',
  };

  // Show AnimatedTextBar on celebration page
  if (location.pathname === '/celebration') {
    return (
      <AnimatedTextBar
        text="♪ Dead or Alive - You Spin Me Round (Like a Record) ♪"
        className="fixed bottom-0 left-0 right-0 z-30 h-20"
      />
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 h-12 bg-[#1f1d2e] border-t border-[#26233a] shadow-lg">
      <div
        className="h-full transition-all duration-300 ease-out"
        style={barStyle}
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-sm font-semibold text-[var(--rp-base05)]">
          {percentage}% ({progress.processed}/{progress.total})
        </span>
      </div>
    </div>
  );
};
