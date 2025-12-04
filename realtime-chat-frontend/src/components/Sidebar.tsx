import type { ChatRoom } from "../types";

interface SidebarProps {
  rooms: ChatRoom[];
  selectedRoomId: string | null;
  onSelectRoom: (id: string) => void;
  onOpenUserList: () => void;
}

export function Sidebar({ rooms, selectedRoomId, onSelectRoom, onOpenUserList }: SidebarProps) {
  return (
    <div style={{ minWidth: "200px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <h2 style={{ fontSize: "18px", marginBottom: "0" }}>Rooms</h2>
        <button
          onClick={onOpenUserList}
          style={{ padding: "4px 8px", borderRadius: "999px", border: "none", backgroundColor: "#333", color: "#f5f5f5", fontSize: "12px", cursor: "pointer" }}
        >
          Felhasználók
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {rooms.map((room) => {
          const label = room.isPrivate && room.otherDisplayName
            ? `DM: ${room.otherDisplayName}`
            : room.name;

          return (
            <button
              key={room.id}
              onClick={() => onSelectRoom(room.id)}
              style={{
                marginBottom: "8px",
                padding: "8px 12px",
                borderRadius: "999px",
                border: "none",
                cursor: "pointer",
                backgroundColor: room.id === selectedRoomId ? "#f5f5f5" : "#333",
                color: room.id === selectedRoomId ? "#111" : "#f5f5f5",
                textAlign: "left",
              }}
            >
              {label}
            </button>
          );
        })}

        {rooms.length === 0 && <p style={{ fontSize: "13px", color: "#777" }}>Nincsenek elérhető szobák.</p>}
      </div>
    </div>
  );
}