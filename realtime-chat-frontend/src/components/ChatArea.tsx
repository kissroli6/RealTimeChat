import { useState, useRef, useEffect } from "react";
import type { ChatRoom, UiMessage } from "../types";

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
  const [selectedUserToAdd, setSelectedUserToAdd] = useState("");
  const [showPanel, setShowPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  useEffect(() => {
    setShowPanel(false);
    setSelectedUserToAdd("");
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

  const handleAddUser = () => {
      if (!selectedUserToAdd || !activeRoom) return;
      onAddMember(activeRoom.id, selectedUserToAdd);
      setSelectedUserToAdd(""); 
  };

  const participants = activeRoom?.participantIds || [];
  const availableUsersToAdd = allUsers.filter(u => !participants.includes(u.id));
  const currentMembers = allUsers.filter(u => participants.includes(u.id));

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
      flexDirection: "row", 
      overflow: "hidden"
    }}>
      
      {/* BAL OLDAL (Chat) */}
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
            {/* Bal oldali rész */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: "50%", backgroundColor: "#7C58DC", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "#fff", fontSize: "18px" }}>
                  {activeRoomLabel.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: "18px", color: "#f5f5f5" }}>{activeRoomLabel}</h2>
                  {isOnline && <span style={{ fontSize: "12px", color: "#9FD633" }}>Online</span>}
                </div>
            </div>

            {/* ✅ JOBB OLDALI GOMB: Három pont, keret nélkül */}
            {/* ✅ VÉGLEGES GOMB: Sidebar stílus + Fehér 3 pont */}
            {isPrivateGroup && (
                <button 
                    onClick={() => setShowPanel(!showPanel)}
                    title={showPanel ? "Panel elrejtése" : "Csoport kezelése"}
                    style={{
                        // Ugyanaz a stílus, mint a Sidebar "+" gombjánál
                        background: showPanel ? "#444" : "#2a2a2a", // Sötétszürke háttér
                        border: "1px solid #333",                   // Halvány keret
                        borderRadius: "50%",                        // Tökéletes kör
                        width: "40px", height: "40px",              // Fix méret
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        padding: 0 // Fontos, hogy ne torzuljon
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = "#777"}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = "#333"}
                >
                    {/* SVG: Direkt fehér színnel (#f5f5f5), hogy biztosan látsszon */}
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

      {/* JOBB OLDAL: ADMIN PANEL */}
      {isPrivateGroup && showPanel && (
          <div style={{ 
              width: "260px", 
              borderLeft: "1px solid #222", 
              backgroundColor: "#111", 
              display: "flex", 
              flexDirection: "column",
              padding: "20px",
              animation: "fadeIn 0.2s ease-in-out"
          }}>
              <style>{`
                @keyframes fadeIn {
                  from { opacity: 0; transform: translateX(10px); }
                  to { opacity: 1; transform: translateX(0); }
                }
              `}</style>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #333", paddingBottom: "10px", marginBottom: "20px" }}>
                <h3 style={{ margin: 0, fontSize: "16px", color: "#ddd" }}>
                    Csoport kezelése
                </h3>
                <button onClick={() => setShowPanel(false)} style={{ background: "transparent", border: "none", color: "#666", cursor: "pointer" }}>✕</button>
              </div>

              <div style={{ marginBottom: "24px" }}>
                  <label style={{ fontSize: "11px", color: "#777", fontWeight: "bold", display: "block", marginBottom: "8px" }}>TAG HOZZÁADÁSA</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <select 
                        value={selectedUserToAdd}
                        onChange={(e) => setSelectedUserToAdd(e.target.value)}
                        style={{ padding: "8px", borderRadius: "8px", backgroundColor: "#222", border: "1px solid #333", color: "#fff", outline: "none" }}
                      >
                          <option value="">Válassz...</option>
                          {availableUsersToAdd.map(u => (
                              <option key={u.id} value={u.id}>{u.displayName}</option>
                          ))}
                      </select>
                      <button 
                        onClick={handleAddUser}
                        disabled={!selectedUserToAdd}
                        style={{ padding: "8px", borderRadius: "8px", backgroundColor: selectedUserToAdd ? "#444" : "#222", color: "#fff", border: "none", cursor: selectedUserToAdd ? "pointer" : "default" }}
                      >
                          Hozzáadás
                      </button>
                  </div>
              </div>

              <div style={{ flex: 1, overflowY: "auto" }}>
                  <label style={{ fontSize: "11px", color: "#777", fontWeight: "bold", display: "block", marginBottom: "8px" }}>JELENLEGI TAGOK ({currentMembers.length})</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {currentMembers.map(member => (
                          <div key={member.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px", backgroundColor: "#1a1a1a", borderRadius: "8px" }}>
                              <span style={{ fontSize: "13px", color: "#eee", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {member.displayName} {member.id === currentUserId && "(Te)"}
                              </span>
                              
                              {member.id !== currentUserId && (
                                  <button 
                                    onClick={() => onRemoveMember(activeRoom.id, member.id)}
                                    title="Eltávolítás a csoportból"
                                    style={{ 
                                        backgroundColor: "transparent", 
                                        border: "none", 
                                        color: "#ff6b6b", 
                                        cursor: "pointer", 
                                        fontWeight: "bold",
                                        padding: "4px 8px"
                                    }}
                                  >
                                      ✕
                                  </button>
                              )}
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}