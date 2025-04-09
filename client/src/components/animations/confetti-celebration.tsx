import { useState, useEffect } from 'react';
import ReactConfetti from 'react-confetti';

interface ConfettiCelebrationProps {
  active: boolean;
  duration?: number; // in ms
  onComplete?: () => void;
}

export function ConfettiCelebration({ active, duration = 4000, onComplete }: ConfettiCelebrationProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [isVisible, setIsVisible] = useState(false);

  // Calculate window size for confetti
  useEffect(() => {
    const updateSize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Control visibility based on active prop
  useEffect(() => {
    if (active) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onComplete) onComplete();
      }, duration);
      return () => clearTimeout(timer);
    }
    return () => {};
  }, [active, duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <ReactConfetti
        width={size.width}
        height={size.height}
        recycle={false}
        numberOfPieces={400}
        gravity={0.15}
        colors={[
          '#FFC3D0', // Light pink
          '#FFEBCE', // Light peach
          '#D1F0FF', // Light blue
          '#FFD6E7', // Soft pink
          '#FFC8BA', // Coral
          '#E2F0CB', // Light green
          '#DCD3FF', // Lavender
        ]}
      />
    </div>
  );
}