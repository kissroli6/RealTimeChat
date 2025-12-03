import type { UiMessage } from "../../types/message";
import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";

interface ChatWindowProps {
  activeRoomLabel: string;
  messages: UiMessage[];
  typingUsers: string[];
  messageInput: string;
  onMessageInputChange: (value: string) => void;
  onSendMessage: () => void;
}

export function ChatWindow({
  activeRoomLabel,
  messages,
  typingUsers,
  messageInput,
  onMessageInputChange,
  onSendMessage,
}: ChatWindowProps) {
  return (
    <div style={{ flex: 1 }}>
      <h2 style={{ fontSize: "20px", marginBottom: "12px" }}>
        {activeRoomLabel}
      </h2>

      <div
        style={{
          borderRadius: "12px",
          backgroundColor: "#181818",
          padding: "12px",
          minHeight: "260px",
          maxHeight: "460px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <MessageList messages={messages} />

        {typingUsers.length > 0 && (
          <div
            style={{
              fontSize: "12px",
              color: "#aaa",
              marginBottom: "8px",
            }}
          >
            {typingUsers.length === 1
              ? "Valaki éppen gépel..."
              : `${typingUsers.length} ember éppen gépel...`}
          </div>
        )}

        <MessageInput
          value={messageInput}
          onChange={onMessageInputChange}
          onSend={onSendMessage}
        />
      </div>
    </div>
  );
}
