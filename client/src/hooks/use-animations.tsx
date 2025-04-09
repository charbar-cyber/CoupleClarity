import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ConfettiCelebration } from '@/components/animations/confetti-celebration';
import { FloatingHearts } from '@/components/animations/floating-hearts';
import { SuccessMessage } from '@/components/animations/success-message';

type AnimationType = 'confetti' | 'hearts' | 'message' | 'none';

interface AnimationContextValue {
  triggerAnimation: (
    type: AnimationType,
    options?: {
      message?: string;
      messageType?: 'relationship' | 'milestone' | 'appreciation' | 'conflict' | 'general';
      duration?: number;
    }
  ) => void;
}

const AnimationContext = createContext<AnimationContextValue | undefined>(undefined);

export function AnimationProvider({ children }: { children: ReactNode }) {
  const [confettiActive, setConfettiActive] = useState(false);
  const [heartsActive, setHeartsActive] = useState(false);
  const [messageActive, setMessageActive] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'relationship' | 'milestone' | 'appreciation' | 'conflict' | 'general'>('general');
  const [messageDuration, setMessageDuration] = useState(5000);

  const triggerAnimation = (
    type: AnimationType,
    options: {
      message?: string;
      messageType?: 'relationship' | 'milestone' | 'appreciation' | 'conflict' | 'general';
      duration?: number;
    } = {}
  ) => {
    const { message = '', messageType = 'general', duration = 5000 } = options;

    // Deactivate all animations first to prevent overlap conflicts
    setConfettiActive(false);
    setHeartsActive(false);
    setMessageActive(false);

    // Short delay to ensure clean start
    setTimeout(() => {
      switch (type) {
        case 'confetti':
          setConfettiActive(true);
          break;
        case 'hearts':
          setHeartsActive(true);
          break;
        case 'message':
          setMessage(message);
          setMessageType(messageType);
          setMessageDuration(duration);
          setMessageActive(true);
          break;
        default:
          // No animation
          break;
      }
    }, 50);
  };

  return (
    <AnimationContext.Provider value={{ triggerAnimation }}>
      {children}
      
      {/* Rendering animations here lets them exist outside component hierarchies */}
      <ConfettiCelebration 
        active={confettiActive} 
        onComplete={() => setConfettiActive(false)} 
      />
      
      <FloatingHearts 
        active={heartsActive} 
        onComplete={() => setHeartsActive(false)} 
      />
      
      <SuccessMessage 
        show={messageActive} 
        message={message} 
        type={messageType}
        duration={messageDuration}
        onClose={() => setMessageActive(false)} 
      />
    </AnimationContext.Provider>
  );
}

export function useAnimations() {
  const context = useContext(AnimationContext);
  if (context === undefined) {
    throw new Error('useAnimations must be used within an AnimationProvider');
  }
  return context;
}

// Helper functions for common animation combinations
export function useCelebrationAnimations() {
  const { triggerAnimation } = useAnimations();

  return {
    celebrateResolution: (message?: string) => {
      triggerAnimation('confetti');
      setTimeout(() => {
        triggerAnimation('message', {
          message,
          messageType: 'conflict',
          duration: 6000
        });
      }, 300);
    },
    
    celebrateMilestone: (message?: string) => {
      triggerAnimation('confetti');
      setTimeout(() => {
        triggerAnimation('message', {
          message,
          messageType: 'milestone',
          duration: 6000
        });
      }, 300);
    },
    
    celebrateAppreciation: () => {
      triggerAnimation('hearts');
      setTimeout(() => {
        triggerAnimation('message', {
          messageType: 'appreciation',
          duration: 5000
        });
      }, 200);
    },
    
    celebrateMessageSent: () => {
      triggerAnimation('hearts');
      setTimeout(() => {
        triggerAnimation('message', {
          messageType: 'relationship',
          duration: 5000
        });
      }, 200);
    }
  };
}