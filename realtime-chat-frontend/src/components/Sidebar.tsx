import { useState } from "react";
import type { ChatRoom, CurrentUser, UserListMode } from "../types";

interface SidebarProps {
  rooms: ChatRoom[];
  selectedRoomId: string | null;
  onSelectRoom: (id: string) => void;
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
    if (activeTab === 'DM') return room.isPrivate && room.otherUserId;
    if (activeTab === 'GROUP') return room.isPrivate && !room.otherUserId;
    if (activeTab === 'PUBLIC') return !room.isPrivate;
    return false;
  });

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2 className="app-name">RealTimeChat</h2>
        <button
          className="icon-button"
          onClick={() => onOpenUserList(activeTab)}
          title="Létrehozás"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>
      <div className="sidebar-tabs">
        <div className="tabs-container">
          {(['DM', 'GROUP', 'PUBLIC'] as UserListMode[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`tab-button ${activeTab === tab ? 'active' : ''}`}
            >
              {tab === 'DM' ? 'DMs' : tab === 'GROUP' ? 'Groups' : 'Public'}
            </button>
          ))}
        </div>
      </div>
      <div className="room-list">
        {filteredRooms.map((room) => {
          const label = room.isPrivate && room.otherDisplayName ? room.otherDisplayName : room.name;
          const initial = label.charAt(0).toUpperCase();
          const r = room as any;
          const lastMsg = r.lastMessage || "Nincs még üzenet";
          const lastSender = r.lastMessageSender || ""; 
          const isOnline = room.isPrivate && (r.isOnline === true);

          return (
            <button
              key={room.id}
              onClick={() => onSelectRoom(room.id)}
              className={`room-item ${room.id === selectedRoomId ? 'selected' : ''}`}
            >
              <div className="avatar">
                {initial}
                {isOnline && <div className="online-indicator" />}
              </div>
              <div className="room-info">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className="room-name">{label}</span>
                </div>
                <div className="room-last-msg">
                  {lastSender ? <span style={{color: "#aaa", marginRight: "4px"}}>{lastSender}:</span> : null}
                  {lastMsg}
                </div>
              </div>
            </button>
          );
        })}
        {filteredRooms.length === 0 && (
          <div style={{ padding: "20px", textAlign: "center", opacity: 0.5 }}>
             <p style={{ fontSize: "13px", color: "#fff" }}>Nincsenek ilyen szobák.</p>
          </div>
        )}
      </div>
      <div className="sidebar-footer">
        <div className="user-mini">
          <div className="my-avatar">
            {currentUser?.displayName?.charAt(0).toUpperCase() || "?"}
          </div>
          <div className="my-info">
            <span className="my-name">{currentUser?.displayName}</span>
            <span className="my-handle">@{currentUser?.userName}</span>
          </div>
        </div>
        <button onClick={onLogout} className="logout-btn">Kijelentkezés</button>
      </div>
    </div>
  );
}