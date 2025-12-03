import type { UiMessage } from "../../types/message";

interface MessageListProps {
  messages: UiMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        marginBottom: "8px",
      }}
    >
      {messages.map((m) => (
        <div key={m.id} style={{ marginBottom: "10px" }}>
          {!m.isOwn && (
            <div
              style={{
                fontSize: "12px",
                color: "#888",
                marginBottom: "2px",
              }}
            >
              {m.displayName || "Ismeretlen felhasználó"}
            </div>
          )}

          <div style={{ textAlign: m.isOwn ? "right" : "left" }}>
            <span
              style={{
                display: "inline-block",
                padding: "6px 10px",
                borderRadius: "999px",
                backgroundColor: m.isOwn ? "#7C58DC" : "#333",
                color: "#f5f5f5",
                fontSize: "14px",
              }}
            >
              {m.content}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
