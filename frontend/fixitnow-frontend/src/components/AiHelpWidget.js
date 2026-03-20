import { useEffect, useMemo, useRef, useState } from "react";
import { requestAssistantHelp } from "../api/assistant";
import { normalizeEmail } from "../auth/localAuth";
import "./AiHelpWidget.css";

const MAX_PROMPT_LENGTH = 400;

const buildWelcomeMessage = (role, userName) => {
  const name = userName?.trim() || "there";
  if (role === "PROVIDER") {
    return `Hi ${name}! I am your AI onboarding assistant. Ask me anything about accepting requests, updating services, messages, and provider settings.`;
  }
  return `Hi ${name}! I am your AI onboarding assistant. Ask me anything about finding services, bookings, chat, and customer settings.`;
};

const isGreetingPrompt = (value = "") =>
  /^(hi+|hello+|hey+|hlo+|yo+|good\s(morning|afternoon|evening))\b/i.test(value.trim());

const localFallbackReply = (role, prompt, userName) => {
  const firstName = String(userName || "").trim().split(/\s+/)[0] || "there";
  if (isGreetingPrompt(prompt)) {
    if (role === "PROVIDER") {
      return `Hi ${firstName}! I am here to help. You can ask: "show my pending requests", "best price for carpentry", or "how to update my services".`;
    }
    return `Hi ${firstName}! I am here to help. You can ask: "show carpentry services", "my latest booking status", or "best rated provider near me".`;
  }

  if (role === "PROVIDER") {
    return "I can help with provider tasks. Try asking about pending requests, pricing for a category, customer messages, or profile settings.";
  }
  return "I can help with customer tasks. Try asking about services, provider suggestions, booking status, messages, or account settings.";
};

const newMessage = (role, text) => ({
  id: `ai-help-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  role,
  text
});

const AiHelpWidget = ({ role = "CUSTOMER", userName = "", userEmail = "", screen = "" }) => {
  const normalizedRole = String(role || "").toUpperCase() === "PROVIDER" ? "PROVIDER" : "CUSTOMER";
  const normalizedEmail = normalizeEmail(userEmail || "");
  const visitStorageKey = useMemo(
    () => `fixitnow_ai_help_seen_${normalizedRole}_${normalizedEmail || "guest"}`,
    [normalizedRole, normalizedEmail]
  );

  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState(() => [
    newMessage("assistant", buildWelcomeMessage(normalizedRole, userName))
  ]);
  const messageEndRef = useRef(null);

  useEffect(() => {
    const hasSeenWidget = localStorage.getItem(visitStorageKey);
    if (!hasSeenWidget) {
      setIsOpen(true);
      localStorage.setItem(visitStorageKey, "1");
    }
  }, [visitStorageKey]);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length !== 1 || prev[0].role !== "assistant") return prev;
      return [newMessage("assistant", buildWelcomeMessage(normalizedRole, userName))];
    });
  }, [normalizedRole, userName]);

  useEffect(() => {
    if (!isOpen) return;
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isOpen, isSending]);

  const sendMessage = async () => {
    const prompt = draft.trim();
    if (!prompt || isSending) return;

    const nextUserMessage = newMessage("user", prompt);
    setMessages((prev) => [...prev, nextUserMessage]);
    setDraft("");
    setIsSending(true);

    try {
      const reply = await requestAssistantHelp({
        message: prompt,
        role: normalizedRole,
        screen
      });

      setMessages((prev) => [
        ...prev,
        newMessage(
          "assistant",
          reply || "I can help with this. Please try asking your question in one short sentence."
        )
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        newMessage("assistant", localFallbackReply(normalizedRole, prompt, userName))
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="ai-help-widget">
      {!isOpen && (
        <button type="button" className="ai-help-launcher" onClick={() => setIsOpen(true)}>
          <span className="ai-help-launcher-icon">AI</span>
          <span>Need Help?</span>
        </button>
      )}

      {isOpen && (
        <section className="ai-help-panel" aria-label="FixItNow AI Help">
          <header className="ai-help-header">
            <div>
              <p className="ai-help-title">FixItNow AI Help</p>
              <p className="ai-help-subtitle">
                {normalizedRole === "PROVIDER" ? "Provider onboarding support" : "Customer onboarding support"}
              </p>
            </div>
            <button
              type="button"
              className="ai-help-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close AI help"
            >
              x
            </button>
          </header>

          <p className="ai-help-note">
            Ask platform-related doubts. Avoid sharing passwords or personal financial details.
          </p>

          <div className="ai-help-messages">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`ai-help-message ${message.role === "user" ? "ai-help-user" : "ai-help-assistant"}`}
              >
                <p>{message.text}</p>
              </article>
            ))}

            {isSending && (
              <article className="ai-help-message ai-help-assistant">
                <p>Thinking...</p>
              </article>
            )}

            <div ref={messageEndRef} />
          </div>

          <div className="ai-help-compose">
            <textarea
              placeholder="Ask your question..."
              value={draft}
              maxLength={MAX_PROMPT_LENGTH}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
            />
            <button type="button" className="portal-button" onClick={sendMessage} disabled={!draft.trim() || isSending}>
              Send
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default AiHelpWidget;
