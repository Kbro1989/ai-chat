const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatContainer = document.getElementById("chat-container");
const tabsContainer = document.getElementById("tabs-container");

let currentSession = "default"; // Active conversation tab
const sessions = {}; // { sessionId: [messages] }

// Utility to render messages
function renderMessages(sessionId) {
  chatContainer.innerHTML = "";
  const messages = sessions[sessionId] || [];
  messages.forEach((msg) => {
    const div = document.createElement("div");
    div.className = msg.role;
    div.textContent = msg.content;
    chatContainer.appendChild(div);
  });
}

// Switch tab
function switchTab(sessionId) {
  currentSession = sessionId;
  renderMessages(currentSession);
}

// Create a new tab
function createTab(sessionId) {
  const button = document.createElement("button");
  button.textContent = sessionId;
  button.onclick = () => switchTab(sessionId);
  tabsContainer.appendChild(button);
  sessions[sessionId] = [];
  switchTab(sessionId);
}

// Initialize default tab
createTab("default");

// Fetch messages from server for a session
async function loadSessionMessages(sessionId) {
  const res = await fetch(`/api/history?sessionId=${sessionId}`);
  if (res.ok) {
    const data = await res.json();
    sessions[sessionId] = data.messages;
    renderMessages(sessionId);
  }
}

// Send a message
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const content = chatInput.value.trim();
  if (!content) return;

  const message = { role: "user", content };
  sessions[currentSession].push(message);
  renderMessages(currentSession);

  chatInput.value = "";

  // Send to backend
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: sessions[currentSession], sessionId: currentSession }),
  });

  if (res.ok) {
    // Stream or JSON response
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let assistantText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      assistantText += chunk;
      // Optional: render streaming
      renderMessages(currentSession);
      const lastMsg = { role: "assistant", content: assistantText };
      sessions[currentSession][sessions[currentSession].length - 1] = lastMsg;
    }

    // Save final assistant message
    sessions[currentSession].push({ role: "assistant", content: assistantText });
    renderMessages(currentSession);
  }
});

// Add a new tab dynamically
document.getElementById("new-tab-btn").addEventListener("click", () => {
  const tabName = prompt("Enter tab/session name:");
  if (tabName && !sessions[tabName]) createTab(tabName);
});
