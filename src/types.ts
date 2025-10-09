export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string;
}

export interface Env {
  AI: any;
  DB: D1Database;
  ASSETS: any;
}
