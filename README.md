# ai-chat — D1-Persistent Chat (Fork)

> TypeScript · Cloudflare Workers · D1 · Fork

Fork of [pick-of-gods/ai-chat](https://github.com/pick-of-gods/ai-chat).
Cloudflare Worker with D1-backed multi-session persistent chat.

Model: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`

```
src/index.ts        # Worker + routing
src/chatHistory.ts  # D1 persistence
src/types.ts
```
