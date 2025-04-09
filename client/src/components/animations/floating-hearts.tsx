import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HeartProps {
  top: string;
  left: string;
  delay: number;
  duration: number;
  scale: number;
  color: string;
}

function Heart({ top, left, delay, duration, scale, color }: HeartProps) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      initial={{ 
        top, 
        left, 
        opacity: 0, 
        scale: scale * 0.5, 
        rotate: Math.random() * 30 - 15 
      }}
      animate={{ 
        top: `calc(${top} - 150px)`, 
        opacity: [0, 1, 0], 
        scale: [scale * 0.5, scale], 
        rotate: Math.random() > 0.5 ? 15 : -15 
      }}
      transition={{
        duration,
        delay,
        ease: "easeOut"
      }}
    >
      <svg
        width="30"
        height="30"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-6 h-6 md:w-8 md:h-8"
      >
        <path
          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
          fill={color}
        />
      </svg>
    </motion.div>
  );
}

interface FloatingHeartsProps {
  active: boolean;
  duration?: number; // in ms
  count?: number;
  onComplete?: () => void;
}

export function FloatingHearts({ active, duration = 3000, count = 12, onComplete }: FloatingHeartsProps) {
  const [hearts, setHearts] = useState<HeartProps[]>([]);
  const [isActive, setIsActive] = useState(false);

  // Colors for the hearts
  const heartColors = [
    '#ff5e5e', // Red
    '#ff7eb9', // Pink
    '#ff65a3', // Hot pink
    '#ff74b8', // Rose
    '#ff4081', // Deep pink
    '#ec407a', // Pink accent
  ];

  useEffect(() => {
    if (active && !isActive) {
      setIsActive(true);
      
      // Generate hearts
      const newHearts = Array.from({ length: count }).map((_, i) => ({
        top: `${80 + Math.random() * 10}%`,
        left: `${10 + Math.random() * 80}%`,
        delay: Math.random() * 0.5,
        duration: 1.5 + Math.random(),
        scale: 0.5 + Math.random() * 1.5,
        color: heartColors[Math.floor(Math.random() * heartColors.length)],
      }));
      
      setHearts(newHearts);
      
      // Clean up
      const timer = setTimeout(() => {
        setIsActive(false);
        setHearts([]);
        if (onComplete) onComplete();
      }, duration);
      
      return () => clearTimeout(timer);
    }
    return () => {};
  }, [active, duration, count, onComplete, heartColors, isActive]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      <AnimatePresence>
        {hearts.map((heart, index) => (
          <Heart key={index} {...heart} />
        ))}
      </AnimatePresence>
    </div>
  );
}