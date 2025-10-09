/// <reference types="@cloudflare/workers-types" />

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string;
}

export interface Env {
  AI: any;        // Your AI binding
  DB: D1Database; // Cloudflare D1 database
  ASSETS: any;    // Static assets binding
}
