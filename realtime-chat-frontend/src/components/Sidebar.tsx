import { useState } from "react";
import type { ChatRoom, CurrentUser, UserListMode } from "../types";

interface SidebarProps {
  rooms: ChatRoom[];
  selectedRoomId: string | null;
  onSelectRoom: (id: string) => void;
  // Módosult: most már várjuk a módot (DM vagy GROUP)
  onOpenUserList: (mode: UserListMode) => void;
  currentUser: CurrentUser | null;
  onLogout: () => void;
}

export function Sidebar({ 
  rooms, 
  selectedRoomId, 
  onSelectRoom, 
  onOpenUserList, 
  currentUser, 
  onLogout 
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<UserListMode>('DM');

  const filteredRooms = rooms.filter(room => {
    if (activeTab === 'DM') return room.isPrivate;
    return !room.isPrivate;
  });

  return (
    <div style={{ 
      height: "100%", 
      backgroundColor: "#161616", 
      borderRadius: "24px", 
      display: "flex", 
      flexDirection: "column",
      border: "1px solid #333",
      overflow: "hidden"
    }}>
      
      {/* --- FEJLÉC + PLUSZ GOMB --- */}
      <div style={{ 
        padding: "20px 20px 16px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between" 
      }}>
        <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px", color: "#f5f5f5" }}>
          RealTimeChat
        </h2>
        
        {/* Plusz Gomb - Most már átadja az aktív fület */}
        <button
          onClick={() => onOpenUserList(activeTab)}
          title={activeTab === 'DM' ? "Új privát üzenet" : "Új csoport létrehozása"}
          style={{
            background: "#2a2a2a",
            border: "1px solid #333",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s",
            padding: 0
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* --- FÜLEK (TABS) --- */}
      <div style={{ padding: "0 20px 16px 20px" }}>
        <div style={{ 
          display: "flex", 
          backgroundColor: "#2a2a2a", 
          borderRadius: "12px", 
          padding: "4px" 
        }}>
          <button
            onClick={() => setActiveTab('DM')}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600,
              backgroundColor: activeTab === 'DM' ? "#444" : "transparent",
              color: activeTab === 'DM' ? "#fff" : "#888",
              transition: "all 0.2s"
            }}
          >
            DMs
          </button>
          <button
            onClick={() => setActiveTab('GROUP')}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600,
              backgroundColor: activeTab === 'GROUP' ? "#444" : "transparent",
              color: activeTab === 'GROUP' ? "#fff" : "#888",
              transition: "all 0.2s"
            }}
          >
            Groups
          </button>
        </div>
      </div>

      {/* --- LISTA --- */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 12px" }}>
        
        {filteredRooms.map((room) => {
          const label = room.isPrivate && room.otherDisplayName
            ? room.otherDisplayName
            : room.name;

          const initial = label.charAt(0).toUpperCase();

          const r = room as any;
          const lastMsg = r.lastMessage || "Nincs még üzenet";
          const lastSender = r.lastMessageSender || ""; 
          const isOnline = room.isPrivate && (r.isOnline === true);

          return (
            <button
              key={room.id}
              onClick={() => onSelectRoom(room.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "4px",
                padding: "12px",
                borderRadius: "12px",
                border: "none",
                cursor: "pointer",
                backgroundColor: room.id === selectedRoomId ? "#2A2A2A" : "transparent",
                textAlign: "left",
                transition: "background 0.2s"
              }}
            >
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{ 
                  width: "42px", 
                  height: "42px", 
                  borderRadius: "50%", 
                  backgroundColor: room.id === selectedRoomId ? "#7C58DC" : "#333",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#fff",
                }}>
                  {initial}
                </div>
                
                {isOnline && (
                  <div style={{
                    position: "absolute",
                    bottom: "2px",
                    right: "2px",
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    backgroundColor: "#9FD633",
                    border: "2px solid #161616" 
                  }} title="Online" />
                )}
              </div>
              
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ 
                    fontSize: "14px", 
                    fontWeight: 600, 
                    color: room.id === selectedRoomId ? "#fff" : "#eee",
                    whiteSpace: "nowrap", 
                    overflow: "hidden", 
                    textOverflow: "ellipsis" 
                  }}>
                    {label}
                  </span>
                </div>

                <div style={{ 
                  fontSize: "12px", 
                  color: "#888", 
                  whiteSpace: "nowrap", 
                  overflow: "hidden", 
                  textOverflow: "ellipsis" 
                }}>
                  {lastSender ? <span style={{color: "#aaa", marginRight: "4px"}}>{lastSender}:</span> : null}
                  {lastMsg}
                </div>
              </div>
            </button>
          );
        })}

        {filteredRooms.length === 0 && (
          <div style={{ padding: "20px", textAlign: "center", opacity: 0.5 }}>
             <p style={{ fontSize: "13px", color: "#fff" }}>
               {activeTab === 'DM' ? "Nincsenek beszélgetések." : "Nincsenek csoportok."}
             </p>
          </div>
        )}
      </div>

      {/* --- LÁBLÉC --- */}
      <div style={{ 
        padding: "16px 20px", 
        borderTop: "1px solid #222",
        backgroundColor: "#1a1a1a",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ 
            width: "36px", height: "36px", 
            borderRadius: "50%", 
            backgroundColor: "#9FD633",
            color: "#000",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: "bold"
          }}>
            {currentUser?.displayName?.charAt(0).toUpperCase() || "?"}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#fff" }}>
              {currentUser?.displayName}
            </span>
            <span style={{ fontSize: "11px", color: "#777" }}>
              @{currentUser?.userName}
            </span>
          </div>
        </div>

        <button 
          onClick={onLogout}
          style={{ 
            background: "transparent", 
            border: "none", 
            cursor: "pointer", 
            color: "#7C58DC", 
            fontSize: "13px",
            fontWeight: 600,
            padding: "4px 8px"
          }}
        >
          Kijelentkezés
        </button>
      </div>
    </div>
  );
}