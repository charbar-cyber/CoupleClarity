import { useEffect, useRef, useState, useCallback } from 'react';
import { wsUrl } from '@/lib/config';

export type WebSocketMessage = {
  type: string;
  data?: any;
  message?: string;
  response?: any; // Added for response notifications
};

// Define the shape of our WebSocket hook return value
interface UseWebSocketReturn {
  connected: boolean;
  messages: WebSocketMessage[];
  sendMessage: (message: WebSocketMessage) => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Create WebSocket connection
    const socket = new WebSocket(wsUrl('/ws'));
    socketRef.current = socket;

    // Connection opened
    socket.addEventListener('open', () => {
      console.log('WebSocket connection established');
      setConnected(true);
    });

    // Listen for messages
    socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        setMessages((prevMessages) => [...prevMessages, message]);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    // Listen for connection closing
    socket.addEventListener('close', () => {
      console.log('WebSocket connection closed');
      setConnected(false);
    });

    // Listen for errors
    socket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
    });

    // Clean up on component unmount
    return () => {
      console.log('Closing WebSocket connection');
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, []);

  // Function to send messages to the WebSocket server
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }, []);

  return {
    connected,
    messages,
    sendMessage
  };
}