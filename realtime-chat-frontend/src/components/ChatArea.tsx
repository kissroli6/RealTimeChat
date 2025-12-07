import { useState, useRef, useEffect } from "react";
import type { ChatRoom, UiMessage } from "../types";
import { ChatAdminPanel } from "./ChatAdminPanel";

type TypingUser = {
  userId: string;
  displayName: string;
};

type SimpleUser = {
    id: string;
    displayName: string;
}

interface ChatAreaProps {
  activeRoom: ChatRoom | undefined;
  messages: UiMessage[];
  typingUsers: TypingUser[];
  onSendMessage: (msg: string) => void;
  onTyping: (val: string) => void;
  currentUserId: string; 
  allUsers: SimpleUser[];
  onAddMember: (roomId: string, userId: string) => void;
  onRemoveMember: (roomId: string, userId: string) => void;
}

export function ChatArea({ 
    activeRoom, 
    messages, 
    typingUsers, 
    onSendMessage, 
    onTyping,
    currentUserId,
    allUsers,
    onAddMember,
    onRemoveMember
}: ChatAreaProps) {
    
  const [input, setInput] = useState("");
  const [showPanel, setShowPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  useEffect(() => {
    setShowPanel(false);
  }, [activeRoom?.id]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput("");
    onTyping(""); 
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    onTyping(val);
  };

  const activeRoomLabel = activeRoom
    ? (activeRoom.isPrivate && activeRoom.otherDisplayName ? activeRoom.otherDisplayName : activeRoom.name)
    : "Válassz egy szobát";

  const isOnline = activeRoom?.isPrivate && (activeRoom as any).isOnline;
  const isPrivateGroup = activeRoom?.isPrivate && !activeRoom.otherUserId;

  const getTypingText = () => {
    if (typingUsers.length === 0) return null;
    const names = typingUsers.map(u => u.displayName); 
    if (names.length === 1) return `${names[0]} éppen gépel...`;
    if (names.length === 2) return `${names[0]} és ${names[1]} éppen gépelnek...`;
    return `${names.slice(0, 2).join(", ")} és további ${names.length - 2} ember gépel...`;
  };

  if (!activeRoom) {
    return (
      <div style={{ height: "100%", backgroundColor: "#161616", borderRadius: "24px", border: "1px solid #333", display: "flex", alignItems: "center", justifyContent: "center", color: "#555" }}>
        <p>Válassz balról egy beszélgetést a kezdéshez.</p>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-main">
          <div className="chat-header">
            <div className="header-info">
                <div className="header-avatar">
                  {activeRoomLabel.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="header-title">{activeRoomLabel}</h2>
                  {isOnline && <span className="status-online">Online</span>}
                </div>
            </div>

            {isPrivateGroup && (
                <button 
                    className={`toggle-panel-btn ${showPanel ? 'active' : ''}`}
                    onClick={() => setShowPanel(!showPanel)}
                    title={showPanel ? "Panel elrejtése" : "Csoport kezelése"}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="2" fill="#f5f5f5"/>
                        <circle cx="12" cy="6" r="2" fill="#f5f5f5"/>
                        <circle cx="12" cy="18" r="2" fill="#f5f5f5"/>
                    </svg>
                </button>
            )}
          </div>
          <div className="messages-list">
            {messages.map((m) => (
              <div key={m.id} className={`message-item ${m.isOwn ? 'own' : 'other'}`}>
                {!m.isOwn && <span className="sender-name">{m.displayName || "Ismeretlen"}</span>}
                <div className="message-bubble">
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="input-area">
            <div className="typing-indicator" style={{ opacity: typingUsers.length > 0 ? 1 : 0 }}>
              {getTypingText()}
            </div>
            <div className="input-wrapper">
              <input 
                type="text" 
                className="chat-input"
                placeholder="Írj üzenetet..." 
                value={input} 
                onChange={handleChange} 
                onKeyDown={(e) => e.key === "Enter" && handleSend()} 
              />
              <button onClick={handleSend} className="send-btn">Küldés</button>
            </div>
          </div>
      </div>
      {isPrivateGroup && showPanel && (
          <ChatAdminPanel 
            activeRoom={activeRoom}
            currentUserId={currentUserId}
            allUsers={allUsers}
            onAddMember={onAddMember}
            onRemoveMember={onRemoveMember}
            onClose={() => setShowPanel(false)}
          />
      )}

    </div>
  );
}