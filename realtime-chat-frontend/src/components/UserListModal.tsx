import { useState, useEffect } from "react";
import type { UserWithPresence, UserListMode } from "../types";

interface UserListModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserWithPresence[];
  mode: UserListMode;
  onSelectUser: (user: UserWithPresence) => void;
  onCreateGroup: (name: string, userIds: string[]) => void;
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
  
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");

  // Segédváltozók a módokhoz
  const isPublic = mode === 'PUBLIC';
  const isGroup = mode === 'GROUP';
  const isDm = mode === 'DM';

  // Csak akkor kell input mező, ha nem DM-et írunk
  const showNameInput = isGroup || isPublic;

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
    const isValid = isPublic 
      ? groupName.trim().length > 0 
      : (groupName.trim().length > 0 && selectedUserIds.length > 0);

    if (isValid) {
      onCreateGroup(groupName, selectedUserIds);
    }
  };

  const getTitle = () => {
    if (isDm) return "Új beszélgetés";
    if (isPublic) return "Új publikus szoba";
    return "Új privát csoport";
  };

  const isButtonDisabled = () => {
    if (isPublic) {
      return !groupName.trim();
    }
    return !groupName.trim() || selectedUserIds.length === 0;
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
        
        {/* FEJLÉC - Itt történt a módosítás */}
        <div style={{ 
          padding: "20px 24px", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          borderBottom: "1px solid #222"
        }}>
          <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#f5f5f5" }}>
            {getTitle()}
          </h3>
          <button 
            onClick={onClose} 
            // MÓDOSÍTOTT STÍLUS: Nincs háttér, nincs keret, nincs borderRadius
            style={{ 
              border: "none", 
              background: "transparent", 
              color: "#888", // Alapból halványabb
              cursor: "pointer", 
              width: "32px", 
              height: "32px",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "20px", // Kicsit nagyobb X
              transition: "color 0.2s",
              padding: 0
            }}
            // Hover effektus: kivilágosodik
            onMouseEnter={(e) => e.currentTarget.style.color = "#fff"}
            onMouseLeave={(e) => e.currentTarget.style.color = "#888"}
          >
            ✕
          </button>
        </div>

        {/* NÉV INPUT */}
        {showNameInput && (
          <div style={{ padding: "24px 24px 0 24px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "#888", marginBottom: "8px", fontWeight: 700, textTransform: "uppercase" }}>
              SZOBA NEVE
            </label>
            <input 
              type="text" 
              placeholder={isPublic ? "pl. Általános csevegő" : "pl. Fejlesztői Csapat"}
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              autoFocus
              style={{
                width: "100%", 
                boxSizing: "border-box",
                padding: "14px 16px", 
                borderRadius: "12px", 
                border: "1px solid #333", 
                backgroundColor: "#222", 
                color: "#fff", 
                fontSize: "15px",
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

        {/* --- TARTALOM --- */}
        
        {/* 1. eset: PUBLIKUS MÓD */}
        {isPublic && (
          <div style={{ padding: "32px 24px", textAlign: "center", color: "#888" }}>
            <div style={{ 
              width: "60px", height: "60px", margin: "0 auto 16px auto", 
              borderRadius: "50%", backgroundColor: "#2a2a2a", 
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#A1DD29"
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
            </div>
            <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.5" }}>
              Ez egy nyilvános szoba lesz.<br/>
              A létrehozás után bárki szabadon csatlakozhat hozzá a listából.
            </p>
          </div>
        )}

        {/* 2. eset: DM vagy PRIVÁT CSOPORT */}
        {!isPublic && (
          <>
            <div style={{ padding: "16px 24px 8px 24px" }}>
              <span style={{ fontSize: "12px", color: "#888", fontWeight: 700, textTransform: "uppercase" }}>
                {isGroup ? "TAGOK KIVÁLASZTÁSA" : "ELÉRHETŐ FELHASZNÁLÓK"}
              </span>
            </div>

            <div style={{ padding: "0 16px 16px 16px", overflowY: "auto", flex: 1, minHeight: "200px" }}>
              {users.map((u) => {
                const initial = u.displayName.charAt(0).toUpperCase();
                const isSelected = selectedUserIds.includes(u.id);
                
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      if (isDm) onSelectUser(u);
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

                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: "#f5f5f5" }}>
                          {u.displayName}
                        </span>
                        
                        {isGroup && (
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
                <p style={{ textAlign: "center", color: "#666", fontSize: "13px", marginTop: "20px" }}>Nincs elérhető felhasználó.</p>
              )}
            </div>
          </>
        )}

        {/* LÁBLÉC GOMB */}
        {showNameInput && (
          <div style={{ padding: "16px 24px", borderTop: "1px solid #222" }}>
            <button
              onClick={handleCreateGroup}
              disabled={isButtonDisabled()}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "999px",
                border: "none",
                backgroundColor: isButtonDisabled() ? "#333" : "#9FD633",
                color: isButtonDisabled() ? "#777" : "#111",
                cursor: isButtonDisabled() ? "not-allowed" : "pointer",
                fontWeight: 700,
                fontSize: "14px",
                transition: "all 0.2s"
              }}
            >
              {isPublic ? "Szoba létrehozása" : "Csoport létrehozása"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}