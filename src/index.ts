/**
 * LLM Chat Worker with D1 persistence
 *
 * Stores chat messages in a D1 database while still supporting Cloudflare Workers AI.
 *
 * @license MIT
 */
import { Env, ChatMessage } from "./types";

// Model ID for Workers AI
const MODEL_ID = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

// Default system prompt
const SYSTEM_PROMPT =
  "You are a helpful, friendly assistant. Provide concise and accurate responses.";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Serve frontend
    if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    // Chat API
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
    const { messages = [] } = (await request.json()) as { messages: ChatMessage[] };

    // Ensure system prompt exists
    if (!messages.some((msg) => msg.role === "system")) {
      messages.unshift({ role: "system", content: SYSTEM_PROMPT });
    }

    // Save user messages to D1
    for (const msg of messages) {
      if (msg.role === "user") {
        await env.DB.prepare(
          `INSERT INTO chats (session_id, role, content) VALUES (?, ?, ?)`
        ).bind("default-session", msg.role, msg.content).run();
      }
    }

    // Call AI
    const aiResponse = await env.AI.run(
      MODEL_ID,
      { messages, max_tokens: 1024 },
      { returnRawResponse: true }
    );

    // Read AI output as text for D1 storage
    const aiText = await aiResponse.text();

    // Save assistant response to D1
    await env.DB.prepare(
      `INSERT INTO chats (session_id, role, content) VALUES (?, ?, ?)`
    ).bind("default-session", "assistant", aiText).run();

    // Return streaming response
    return new Response(aiText, {
      headers: { "Content-Type": "text/plain" },
    });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
