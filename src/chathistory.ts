import { Env, ChatMessage } from "./types";

export class ChatHistory {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  async ensureTable() {
    await this.env.DB.exec(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        session_id TEXT NOT NULL DEFAULT 'default'
      )
    `);

    await this.env.DB.exec(`
      CREATE INDEX IF NOT EXISTS idx_chat_history_created_at
      ON chat_history (created_at)
    `);

    await this.env.DB.exec(`
      CREATE INDEX IF NOT EXISTS idx_chat_history_session_id
      ON chat_history (session_id)
    `);
  }

  async saveMessage(message: ChatMessage, sessionId = "default") {
    await this.env.DB.exec(
      `INSERT INTO chat_history (role, content, session_id) VALUES (?, ?, ?)`,
      [message.role, message.content, sessionId]
    );
  }

  async getMessages(sessionId = "default", limit = 50): Promise<ChatMessage[]> {
    const result = await this.env.DB.prepare(
      `SELECT role, content, created_at FROM chat_history WHERE session_id = ? ORDER BY created_at ASC LIMIT ?`
    ).bind(sessionId, limit).all<{ role: string; content: string; created_at: string }>();

    return result.results.map((row) => ({
      role: row.role as "user" | "assistant" | "system",
      content: row.content,
      createdAt: row.created_at,
    }));
  }

  async clearSession(sessionId = "default") {
    await this.env.DB.exec(`DELETE FROM chat_history WHERE session_id = ?`, [sessionId]);
  }
}
