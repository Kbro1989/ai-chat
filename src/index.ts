import { Env } from "./types";
import { ChatHistory } from "./chatHistory";

const MODEL_ID = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const SYSTEM_PROMPT = "You are a helpful, friendly assistant. Provide concise and accurate responses.";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Serve frontend
    if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    const chatHistory = new ChatHistory(env);
    await chatHistory.ensureTable();

    if (url.pathname === "/api/chat" && request.method === "POST") {
      const { messages = [], sessionId = "default" } = await request.json();
      if (!messages.some(m => m.role === "system")) messages.unshift({ role: "system", content: SYSTEM_PROMPT });
      messages.forEach(msg => chatHistory.saveMessage(msg, sessionId));

      const response = await env.AI.run(MODEL_ID, { messages, max_tokens: 1024 }, { returnRawResponse: true });
      return response;
    }

    if (url.pathname === "/api/history" && request.method === "GET") {
      const sessionId = url.searchParams.get("sessionId") || "default";
      const msgs = await chatHistory.getMessages(sessionId);
      return new Response(JSON.stringify({ messages: msgs }), { headers: { "Content-Type": "application/json" } });
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
