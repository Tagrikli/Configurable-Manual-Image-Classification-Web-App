import { useEffect, useMemo, useState } from 'react';

interface AnimatedTextBarProps {
  text: string;
  className?: string;
}

export const AnimatedTextBar = ({ text, className = '' }: AnimatedTextBarProps) => {
  const confettiColors = useMemo(() => ['#ffd166', '#06d6a0', '#4cc9f0', '#f72585', '#ffc6ff'], []);
  const [colorIndex, setColorIndex] = useState(0);

  useEffect(() => {
    if (confettiColors.length < 2) {
      setColorIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setColorIndex(current => (current + 1) % confettiColors.length);
    }, 900);

    return () => window.clearInterval(interval);
  }, [confettiColors]);

  const nextColor = confettiColors[(colorIndex + 1) % confettiColors.length];
  const barStyle = {
    background: `linear-gradient(120deg, ${confettiColors[colorIndex]}, ${nextColor})`,
    transition: 'background 0.8s ease-in-out',
  };

  return (
    <div
      className={`overflow-hidden ${className}`}
      style={barStyle}
    >
      <div className="h-full flex items-center">
        <div
          className="animate-scroll whitespace-nowrap text-4xl font-bold"
          style={{
            color: '#6B00AA',
            textShadow: '0 0 10px #ff00ff, 0 0 20px #ff00ff, 0 0 30px #ff00ff, 0 0 40px #8B008B'
          }}
        >
          {text}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        </div>
      </div>
    </div>
  );
};