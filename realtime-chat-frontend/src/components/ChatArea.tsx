import { useState, useRef, useEffect } from "react";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Automatikus görgetés az aljára új üzenetnél
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput("");
    onTyping(""); // Gépelés leállítása küldéskor
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    onTyping(val);
  };

  // Szoba név és státusz meghatározása
  const activeRoomLabel = activeRoom
    ? (activeRoom.isPrivate && activeRoom.otherDisplayName ? activeRoom.otherDisplayName : activeRoom.name)
    : "Válassz egy szobát";

  // Ha privát a szoba, megnézzük az online státuszt (feltételezve, hogy a típusban benne van)
  const isOnline = activeRoom?.isPrivate && (activeRoom as any).isOnline;

  if (!activeRoom) {
    return (
      <div style={{ 
        height: "100%", 
        backgroundColor: "#161616", 
        borderRadius: "24px", 
        border: "1px solid #333",
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        color: "#555"
      }}>
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
      flexDirection: "column",
      overflow: "hidden"
    }}>
      
      {/* --- HEADER --- */}
      <div style={{ 
        padding: "20px 24px", 
        borderBottom: "1px solid #222",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        backgroundColor: "#1a1a1a"
      }}>
        {/* Nagyobb Avatar a fejlécben */}
        <div style={{ 
          width: "42px", height: "42px", 
          borderRadius: "50%", 
          backgroundColor: "#7C58DC",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: "bold", color: "#fff", fontSize: "18px"
        }}>
          {activeRoomLabel.charAt(0).toUpperCase()}
        </div>

        <div>
          <h2 style={{ margin: 0, fontSize: "18px", color: "#f5f5f5" }}>
            {activeRoomLabel}
          </h2>
          {isOnline && (
            <span style={{ fontSize: "12px", color: "#9FD633", display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#9FD633" }}></span>
              Online
            </span>
          )}
        </div>
      </div>

      {/* --- MESSAGES AREA --- */}
      <div style={{ 
        flex: 1, 
        overflowY: "auto", 
        padding: "20px", 
        display: "flex", 
        flexDirection: "column",
        gap: "8px" 
      }}>
        {messages.map((m) => (
          <div 
            key={m.id} 
            style={{ 
              display: "flex", 
              flexDirection: "column", 
              alignItems: m.isOwn ? "flex-end" : "flex-start",
              maxWidth: "70%",
              alignSelf: m.isOwn ? "flex-end" : "flex-start"
            }}
          >
            {/* Név kiírása, ha nem saját üzenet */}
            {!m.isOwn && (
              <span style={{ fontSize: "11px", color: "#777", marginLeft: "12px", marginBottom: "4px" }}>
                {m.displayName || "Ismeretlen"}
              </span>
            )}

            {/* Üzenet buborék */}
            <div style={{ 
              padding: "12px 16px", 
              borderRadius: m.isOwn ? "18px 18px 0 18px" : "18px 18px 18px 0", // Sarkok kerekítése
              backgroundColor: m.isOwn ? "#7C58DC" : "#2a2a2a", // Lila vs Szürke
              color: "#f5f5f5",
              fontSize: "15px",
              lineHeight: "1.4",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              wordBreak: "break-word"
            }}>
              {m.content}
            </div>
            
            {/* Időbélyeg (opcionális, ha van 'createdAt' a messageben) */}
            {/* <span style={{ fontSize: "10px", color: "#555", marginTop: "2px", marginRight: m.isOwn ? "4px" : "0", marginLeft: !m.isOwn ? "4px" : "0" }}>10:42</span> */}
          </div>
        ))}
        
        {/* Üres div a görgetéshez */}
        <div ref={messagesEndRef} />
      </div>

      {/* --- TYPING INDICATOR & INPUT --- */}
      <div style={{ padding: "0 20px 20px 20px" }}>
        
        {/* Gépelés jelző */}
        <div style={{ minHeight: "20px", marginBottom: "8px", fontSize: "12px", color: "#777", paddingLeft: "16px" }}>
          {typingUsers.length > 0 && (
            <span style={{ fontStyle: "italic" }}>
              {typingUsers.length === 1 ? "Valaki éppen gépel..." : `${typingUsers.length} ember éppen gépel...`}
            </span>
          )}
        </div>

        {/* Input Sáv */}
        <div style={{ 
          display: "flex", 
          gap: "10px", 
          backgroundColor: "#2a2a2a", 
          padding: "8px", 
          borderRadius: "999px",
          border: "1px solid #333"
        }}>
          <input
            type="text"
            placeholder="Írj üzenetet..."
            value={input}
            onChange={handleChange}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            style={{ 
              flex: 1, 
              padding: "10px 16px", 
              borderRadius: "999px", 
              border: "none", 
              backgroundColor: "transparent", 
              color: "#f5f5f5",
              fontSize: "14px",
              outline: "none"
            }}
          />
          <button
            onClick={handleSend}
            style={{ 
              padding: "10px 24px", 
              borderRadius: "999px", 
              border: "none", 
              backgroundColor: "#9FD633", 
              color: "#111", 
              cursor: "pointer", 
              fontWeight: 700,
              fontSize: "14px",
              transition: "opacity 0.2s"
            }}
          >
            Küldés
          </button>
        </div>
      </div>
    </div>
  );
}