/// <reference types="@cloudflare/workers-types" />

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string;
}

export interface Env {
  AI: any; // Replace with actual AI type if you have one
  DB: D1Database; // Cloudflare D1 binding
  ASSETS: { fetch(input: RequestInfo, init?: RequestInit): Promise<Response> }; // KV or static assets
}
