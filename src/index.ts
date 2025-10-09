import { Env, ChatMessage } from "./types";

// Workers AI model
const MODEL_ID = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

// Default system prompt
const SYSTEM_PROMPT =
  "You are a helpful, friendly assistant. Provide concise and accurate responses.";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Serve frontend assets
    if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    // Chat API
    if (url.pathname === "/api/chat" && request.method === "POST") {
      return handleChatRequest(request, env);
    }

    // History API
    if (url.pathname === "/api/history" && request.method === "GET") {
      return handleHistoryRequest(env);
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

/**
 * Handles chat messages
 */
async function handleChatRequest(request: Request, env: Env): Promise<Response> {
  try {
    const { messages = [] } = (await request.json()) as { messages: ChatMessage[] };

    // Add system prompt if missing
    if (!messages.some((msg) => msg.role === "system")) {
      messages.unshift({ role: "system", content: SYSTEM_PROMPT });
    }

    // Call Workers AI
    const aiResponse = await env.AI.run(
      MODEL_ID,
      { messages, max_tokens: 1024 },
      { returnRawResponse: true }
    );

    // Save user and AI messages to D1
    const lastUserMessage = messages[messages.length - 1];
    const reader = aiResponse.body.getReader();
    const decoder = new TextDecoder();
    let assistantContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      assistantContent += decoder.decode(value, { stream: true });
    }

    // Insert both messages into D1
    await env.DB.prepare(
      `INSERT INTO chat_history (role, content, created_at) VALUES (?, ?, ?)`
    ).bind("user", lastUserMessage.content, new Date().toISOString()).run();

    await env.DB.prepare(
      `INSERT INTO chat_history (role, content, created_at) VALUES (?, ?, ?)`
    ).bind("assistant", assistantContent, new Date().toISOString()).run();

    // Return the AI response as a streamed text response
    return new Response(assistantContent, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("Chat request error:", err);
    return new Response(JSON.stringify({ error: "Failed to process request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Returns chat history from D1
 */
async function handleHistoryRequest(env: Env): Promise<Response> {
  try {
    const result = await env.DB.prepare(`SELECT role, content FROM chat_history ORDER BY created_at ASC`).all();
    return new Response(JSON.stringify(result.results ?? []), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("History request error:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch history" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
