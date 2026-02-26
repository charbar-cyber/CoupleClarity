import { WebSocket } from "ws";

// Re-export the single canonical isAuthenticated from auth.ts
export { isAuthenticated } from "../auth";

// Extended WebSocket interface with userId
export interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
}

// Shared context passed to all route modules
export interface RouteContext {
  clients: Map<number, AuthenticatedWebSocket>;
  sendNotification: (userId: number, data: NotificationData) => Promise<void>;
}

export interface NotificationData {
  title: string;
  body: string;
  url: string;
  type: string;
}
