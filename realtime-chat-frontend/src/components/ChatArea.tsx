import { useState } from "react";
import type { ChatRoom, UiMessage } from "../types";

interface ChatAreaProps {
  activeRoom: ChatRoom | undefined;
  messages: UiMessage[];
  typingUsers: string[];
  onSendMessage: (msg: string) => void;
  onTyping: (val: string) => void;
}

export function ChatArea({ activeRoom, messages, typingUsers, onSendMessage, onTyping }: ChatAreaProps) {
  const [input, setInput] = useState("");

  const handleSend = () => {
    onSendMessage(input);
    setInput("");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    onTyping(val);
  };

  const activeRoomLabel = activeRoom
    ? (activeRoom.isPrivate && activeRoom.otherDisplayName ? `DM: ${activeRoom.otherDisplayName}` : activeRoom.name)
    : "Chat";

  return (
    <div style={{ flex: 1 }}>
      <h2 style={{ fontSize: "20px", marginBottom: "12px" }}>{activeRoomLabel}</h2>

      <div style={{ borderRadius: "12px", backgroundColor: "#181818", padding: "12px", minHeight: "260px", maxHeight: "460px", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflowY: "auto", marginBottom: "8px" }}>
          {messages.map((m) => (
            <div key={m.id} style={{ marginBottom: "10px" }}>
              {!m.isOwn && (
                <div style={{ fontSize: "12px", color: "#888", marginBottom: "2px" }}>
                  {m.displayName || "Ismeretlen"}
                </div>
              )}
              <div style={{ textAlign: m.isOwn ? "right" : "left" }}>
                <span style={{ display: "inline-block", padding: "6px 10px", borderRadius: "999px", backgroundColor: m.isOwn ? "#7C58DC" : "#333", color: "#f5f5f5", fontSize: "14px" }}>
                  {m.content}
                </span>
              </div>
            </div>
          ))}
        </div>

        {typingUsers.length > 0 && (
          <div style={{ fontSize: "12px", color: "#aaa", marginBottom: "8px" }}>
            {typingUsers.length === 1 ? "Valaki éppen gépel..." : `${typingUsers.length} ember éppen gépel...`}
          </div>
        )}

        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            placeholder="Írj üzenetet..."
            value={input}
            onChange={handleChange}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            style={{ flex: 1, padding: "8px 10px", borderRadius: "999px", border: "1px solid #333", backgroundColor: "#111", color: "#f5f5f5" }}
          />
          <button
            onClick={handleSend}
            style={{ padding: "8px 16px", borderRadius: "999px", border: "none", backgroundColor: "#9FD633", color: "#111", cursor: "pointer", fontWeight: 600 }}
          >
            Küldés
          </button>
        </div>
      </div>
    </div>
  );
}