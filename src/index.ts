import { Env, ChatMessage } from "./types";
import { ChatHistory } from "./chatHistory";

// LLM model
const MODEL_ID = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const SYSTEM_PROMPT =
  "You are a helpful, friendly assistant. Provide concise and accurate responses.";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Serve frontend
    if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    // API route for chat
    if (url.pathname === "/api/chat") {
      if (request.method === "POST") {
        return handleChatRequest(request, env);
      }
      return new Response("Method not allowed", { status: 405 });
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

async function handleChatRequest(request: Request, env: Env): Promise<Response> {
  try {
    const { messages = [], sessionId = "default" } = (await request.json()) as {
      messages: ChatMessage[];
      sessionId?: string;
    };

    // Add system message if missing
    if (!messages.some((msg) => msg.role === "system")) {
      messages.unshift({ role: "system", content: SYSTEM_PROMPT });
    }

    // Ensure DB table exists
    const history = new ChatHistory(env);
    await history.ensureTable();

    // Save user messages to D1
    for (const msg of messages.filter((m) => m.role === "user")) {
      await history.saveMessage(msg, sessionId);
    }

    // Call Workers AI model
    const response = await env.AI.run(
      MODEL_ID,
      { messages, max_tokens: 1024 },
      { returnRawResponse: true }
    );

    // Optional: store assistant response after streaming
    // You can fetch the streamed text and save it here
    // await history.saveMessage({ role: "assistant", content: assistantText }, sessionId);

    return response;
  } catch (err) {
    console.error("Chat request error:", err);
    return new Response(JSON.stringify({ error: "Failed to process chat request" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
