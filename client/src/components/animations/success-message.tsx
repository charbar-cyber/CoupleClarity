import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Heart, Star, ThumbsUp, Trophy } from 'lucide-react';

interface SuccessMessageProps {
  show: boolean;
  message?: string;
  type?: 'relationship' | 'milestone' | 'appreciation' | 'conflict' | 'general';
  duration?: number; // in ms
  onClose?: () => void;
}

const messages = {
  relationship: [
    "That message just made your relationship stronger!",
    "Your connection is growing stronger every day!",
    "Small steps lead to big relationship growth!",
    "You're nurturing your relationship beautifully!",
  ],
  milestone: [
    "Congrats on this important milestone!",
    "Another beautiful moment to cherish together!",
    "You're building a beautiful story together!",
    "Wonderful memories in the making!",
  ],
  appreciation: [
    "Your partner will feel valued and loved!",
    "Small appreciations build strong foundations!",
    "Noticing the little things makes a big difference!",
    "Your kindness strengthens your connection!",
  ],
  conflict: [
    "You've taken another step toward understanding!",
    "Resolving conflicts builds a stronger future!",
    "Every resolved conflict brings you closer!",
    "Great job navigating through challenges together!",
  ],
  general: [
    "You're doing great!",
    "Small actions create meaningful change!",
    "You're making a positive difference!",
    "Keep up the wonderful work!",
  ]
};

const icons = {
  relationship: Heart,
  milestone: Trophy,
  appreciation: ThumbsUp,
  conflict: Check,
  general: Star,
};

export function SuccessMessage({ 
  show, 
  message, 
  type = 'general', 
  duration = 5000, 
  onClose 
}: SuccessMessageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [displayMessage, setDisplayMessage] = useState('');
  
  // Choose icon based on type
  const Icon = icons[type];
  
  useEffect(() => {
    if (show) {
      // If message is provided, use it, otherwise pick a random one from the type
      const messageToShow = message || messages[type][Math.floor(Math.random() * messages[type].length)];
      setDisplayMessage(messageToShow);
      setIsVisible(true);
      
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) setTimeout(onClose, 300); // Give animation time to finish
      }, duration);
      
      return () => clearTimeout(timer);
    }
    return () => {};
  }, [show, message, type, duration, onClose]);
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 min-w-72 max-w-md"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div className="bg-gradient-to-r from-primary/80 to-primary-foreground/80 backdrop-blur-sm text-primary-foreground px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 border border-primary/20">
            <div className="bg-primary rounded-full p-2 flex-shrink-0">
              <Icon className="w-5 h-5 text-primary-foreground" />
            </div>
            <p className="font-medium text-sm">{displayMessage}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}