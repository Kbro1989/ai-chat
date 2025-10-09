/**
 * LLM Chat Application Template with D1 persistence
 *
 * A simple chat application using Cloudflare Workers AI.
 * Messages are stored in a D1 database while streaming AI responses.
 *
 * @license MIT
 */
import { Env, ChatMessage } from "./types";

// Model ID for Workers AI model
const MODEL_ID = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

// Default system prompt
const SYSTEM_PROMPT =
  "You are a helpful, friendly assistant. Provide concise and accurate responses.";

export default {
  /**
   * Main request handler for the Worker
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Serve static assets (frontend)
    if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    // API Routes
    if (url.pathname === "/api/chat") {
      if (request.method === "POST") {
        return handleChatRequest(request, env);
      }
      return new Response("Method not allowed", { status: 405 });
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

/**
 * Handles chat API requests and stores messages in D1
 */
async function handleChatRequest(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const { messages = [] } = (await request.json()) as { messages: ChatMessage[] };

    // Add system prompt if missing
    if (!messages.some((msg) => msg.role === "system")) {
      messages.unshift({ role: "system", content: SYSTEM_PROMPT });
    }

    // Persist messages to D1
    for (const msg of messages) {
      await env.DB.prepare(
        "INSERT INTO chats (session_id, role, content) VALUES (?, ?, ?)"
      )
        .bind("default-session", msg.role, msg.content)
        .run();
    }

    // Run AI model
    const response = await env.AI.run(
      MODEL_ID,
      { messages, max_tokens: 1024 },
      { returnRawResponse: true }
    );

    return response;
  } catch (error) {
    console.error("Error processing chat request:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
