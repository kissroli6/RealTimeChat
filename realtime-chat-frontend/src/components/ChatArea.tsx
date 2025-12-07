import { useState, useRef, useEffect } from "react";
import type { ChatRoom, UiMessage } from "../types";
import { ChatAdminPanel } from "./ChatAdminPanel"; // IMPORTÁLJUK AZ ÚJ KOMPONENST

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
  // A panel nyitottságát itt tároljuk, mert a gomb a Headerben van
  const [showPanel, setShowPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  // Ha szobát váltunk, panel bezárása
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
    <div style={{ 
      height: "100%", 
      backgroundColor: "#161616", 
      borderRadius: "24px", 
      border: "1px solid #333",
      display: "flex", 
      flexDirection: "row", // Egymás mellett legyen a Chat és az Admin
      overflow: "hidden"
    }}>
      
      {/* --- BAL OLDAL (CHAT) --- */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          
          {/* HEADER */}
          <div style={{ 
              padding: "20px 24px", 
              borderBottom: "1px solid #222", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between",
              backgroundColor: "#1a1a1a"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: "50%", backgroundColor: "#7C58DC", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "#fff", fontSize: "18px" }}>
                  {activeRoomLabel.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: "18px", color: "#f5f5f5" }}>{activeRoomLabel}</h2>
                  {isOnline && <span style={{ fontSize: "12px", color: "#9FD633" }}>Online</span>}
                </div>
            </div>

            {/* Admin Panel Toggle Gomb */}
            {isPrivateGroup && (
                <button 
                    onClick={() => setShowPanel(!showPanel)}
                    title={showPanel ? "Panel elrejtése" : "Csoport kezelése"}
                    style={{
                        background: showPanel ? "#444" : "#2a2a2a", 
                        border: "1px solid #333",                   
                        borderRadius: "50%",                        
                        width: "40px", height: "40px",              
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        padding: 0
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = "#777"}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = "#333"}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="2" fill="#f5f5f5"/>
                        <circle cx="12" cy="6" r="2" fill="#f5f5f5"/>
                        <circle cx="12" cy="18" r="2" fill="#f5f5f5"/>
                    </svg>
                </button>
            )}
          </div>

          {/* ÜZENETEK */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {messages.map((m) => (
              <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: m.isOwn ? "flex-end" : "flex-start", maxWidth: "70%", alignSelf: m.isOwn ? "flex-end" : "flex-start" }}>
                {!m.isOwn && <span style={{ fontSize: "11px", color: "#777", marginLeft: "12px", marginBottom: "4px" }}>{m.displayName || "Ismeretlen"}</span>}
                <div style={{ padding: "12px 16px", borderRadius: m.isOwn ? "18px 18px 0 18px" : "18px 18px 18px 0", backgroundColor: m.isOwn ? "#7C58DC" : "#2a2a2a", color: "#f5f5f5", fontSize: "15px", lineHeight: "1.4", wordBreak: "break-word" }}>
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT */}
          <div style={{ padding: "0 20px 20px 20px" }}>
            <div style={{ minHeight: "20px", marginBottom: "8px", fontSize: "12px", color: "#9FD633", paddingLeft: "16px", fontStyle: "italic", opacity: typingUsers.length > 0 ? 1 : 0 }}>
              {getTypingText()}
            </div>
            <div style={{ display: "flex", gap: "10px", backgroundColor: "#2a2a2a", padding: "8px", borderRadius: "999px", border: "1px solid #333" }}>
              <input type="text" placeholder="Írj üzenetet..." value={input} onChange={handleChange} onKeyDown={(e) => e.key === "Enter" && handleSend()} style={{ flex: 1, padding: "10px 16px", borderRadius: "999px", border: "none", backgroundColor: "transparent", color: "#f5f5f5", fontSize: "14px", outline: "none" }} />
              <button onClick={handleSend} style={{ padding: "10px 24px", borderRadius: "999px", border: "none", backgroundColor: "#9FD633", color: "#111", cursor: "pointer", fontWeight: 700, fontSize: "14px" }}>Küldés</button>
            </div>
          </div>
      </div>

      {/* --- JOBB OLDAL (ADMIN KOMPONENS) --- */}
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