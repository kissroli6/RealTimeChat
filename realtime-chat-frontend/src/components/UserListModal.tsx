import { useState, useEffect } from "react";
import type { UserWithPresence, UserListMode } from "../types";

interface UserListModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserWithPresence[];
  mode: UserListMode; // ÚJ PROP: tudnunk kell, milyen módban nyitottuk meg
  onSelectUser: (user: UserWithPresence) => void; // DM mód callback
  onCreateGroup: (name: string, userIds: string[]) => void; // Csoport mód callback
  error: string | null;
}

export function UserListModal({ 
  isOpen, 
  onClose, 
  users, 
  mode,
  onSelectUser, 
  onCreateGroup,
  error 
}: UserListModalProps) {
  
  // Csoport létrehozáshoz szükséges state-ek
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");

  // Reseteljük a state-et, ha megnyílik a modal
  useEffect(() => {
    if (isOpen) {
      setSelectedUserIds([]);
      setGroupName("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateGroup = () => {
    if (groupName.trim() && selectedUserIds.length > 0) {
      onCreateGroup(groupName, selectedUserIds);
    }
  };

  return (
    <div style={{ 
      position: "fixed", 
      inset: 0, 
      backgroundColor: "rgba(0,0,0,0.7)", 
      backdropFilter: "blur(4px)",
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      zIndex: 1000 
    }}>
      
      <div style={{ 
        width: "100%", 
        maxWidth: "420px", 
        backgroundColor: "#161616", 
        borderRadius: "24px", 
        border: "1px solid #333",
        boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        display: "flex",
        flexDirection: "column",
        maxHeight: "85vh",
        overflow: "hidden"
      }}>
        
        {/* FEJLÉC */}
        <div style={{ 
          padding: "20px 24px", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          borderBottom: "1px solid #222"
        }}>
          <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#f5f5f5" }}>
            {mode === 'DM' ? "Új beszélgetés" : "Új csoport létrehozása"}
          </h3>
          <button 
            onClick={onClose} 
            style={{ 
              border: "1px solid #333", 
              background: "#222", 
              color: "#fff", 
              cursor: "pointer", 
              width: "32px", 
              height: "32px", 
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}
          >
            ✕
          </button>
        </div>

        {/* CSOPORT NÉV INPUT (Csak GROUP módban) */}
        {mode === 'GROUP' && (
          <div style={{ padding: "16px 24px 0 24px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "#888", marginBottom: "8px", fontWeight: 700, textTransform: "uppercase" }}>
              CSOPORT NEVE
            </label>
            <input 
              type="text" 
              placeholder="pl. Fejlesztői Csapat"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              style={{
                width: "100%", 
                boxSizing: "border-box",
                padding: "12px 16px", 
                borderRadius: "12px", 
                border: "1px solid #333", 
                backgroundColor: "#222", 
                color: "#fff", 
                fontSize: "14px",
                outline: "none"
              }}
            />
          </div>
        )}

        {error && (
          <div style={{ padding: "0 24px", marginTop: "16px" }}>
            <p style={{ backgroundColor: "rgba(255, 107, 107, 0.1)", color: "#ff6b6b", fontSize: "13px", padding: "10px", borderRadius: "8px", margin: 0, textAlign: "center" }}>
              {error}
            </p>
          </div>
        )}

        {/* LISTA FEJLÉC */}
        <div style={{ padding: "16px 24px 8px 24px" }}>
          <span style={{ fontSize: "12px", color: "#888", fontWeight: 700, textTransform: "uppercase" }}>
            {mode === 'GROUP' ? "VÁLASSZ TAGOKAT" : "ELÉRHETŐ FELHASZNÁLÓK"}
          </span>
        </div>

        {/* USER LISTA */}
        <div style={{ padding: "0 16px 16px 16px", overflowY: "auto", flex: 1 }}>
          {users.map((u) => {
             const initial = u.displayName.charAt(0).toUpperCase();
             const isSelected = selectedUserIds.includes(u.id);
             
             return (
              <button
                key={u.id}
                onClick={() => {
                  if (mode === 'DM') onSelectUser(u);
                  else handleToggleUser(u.id);
                }}
                style={{ 
                  width: "100%", 
                  textAlign: "left", 
                  padding: "10px 12px", 
                  borderRadius: "16px", 
                  border: isSelected ? "1px solid #7C58DC" : "1px solid transparent", 
                  backgroundColor: isSelected ? "rgba(124, 88, 220, 0.1)" : "transparent", 
                  cursor: "pointer", 
                  marginBottom: "4px", 
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => { if(!isSelected) e.currentTarget.style.backgroundColor = "#2a2a2a" }}
                onMouseLeave={(e) => { if(!isSelected) e.currentTarget.style.backgroundColor = "transparent" }}
              >
                {/* Avatar */}
                <div style={{ position: "relative" }}>
                  <div style={{ 
                    width: "40px", height: "40px", borderRadius: "50%", 
                    backgroundColor: "#333", color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: "bold", fontSize: "16px"
                  }}>
                    {initial}
                  </div>
                  {u.isOnline && (
                    <div style={{
                      position: "absolute", bottom: "0", right: "0",
                      width: "10px", height: "10px", borderRadius: "50%",
                      backgroundColor: "#9FD633", border: "2px solid #161616"
                    }} />
                  )}
                </div>

                {/* Adatok */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#f5f5f5" }}>
                      {u.displayName}
                    </span>
                    
                    {/* Checkbox indikátor GROUP módban */}
                    {mode === 'GROUP' && (
                      <div style={{ 
                        width: "20px", height: "20px", borderRadius: "6px", 
                        border: isSelected ? "none" : "2px solid #444",
                        backgroundColor: isSelected ? "#7C58DC" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center"
                      }}>
                        {isSelected && <span style={{color: "#fff", fontSize: "12px"}}>✓</span>}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: "12px", color: "#888" }}>@{u.userName}</div>
                </div>
              </button>
            );
          })}
          
          {users.length === 0 && !error && (
            <p style={{ textAlign: "center", color: "#666", fontSize: "13px" }}>Nincs más elérhető felhasználó.</p>
          )}
        </div>

        {/* LÁBLÉC GOMB (Csak GROUP módban) */}
        {mode === 'GROUP' && (
          <div style={{ padding: "16px 24px", borderTop: "1px solid #222" }}>
            <button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || selectedUserIds.length === 0}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "999px",
                border: "none",
                backgroundColor: (!groupName.trim() || selectedUserIds.length === 0) ? "#333" : "#9FD633",
                color: (!groupName.trim() || selectedUserIds.length === 0) ? "#777" : "#111",
                cursor: (!groupName.trim() || selectedUserIds.length === 0) ? "not-allowed" : "pointer",
                fontWeight: 700,
                fontSize: "14px",
                transition: "all 0.2s"
              }}
            >
              Csoport Létrehozása
            </button>
          </div>
        )}

      </div>
    </div>
  );
}