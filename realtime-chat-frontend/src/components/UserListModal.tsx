import { useState, useEffect, useMemo } from "react";
import type { UserWithPresence, UserListMode, CurrentUser } from "../types";

interface UserListModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserWithPresence[];
  mode: UserListMode;
  onSelectUser: (user: UserWithPresence) => void;
  onCreateGroup: (name: string, userIds: string[]) => void;
  error: string | null;
  currentUser: CurrentUser;
}

export function UserListModal({ 
  isOpen, 
  onClose, 
  users, 
  mode,
  onSelectUser, 
  onCreateGroup,
  error,
  currentUser
}: UserListModalProps) {
  
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");

  const isPublic = mode === 'PUBLIC';
  const isGroup = mode === 'GROUP';
  const isDm = mode === 'DM';
  const showNameInput = isGroup || isPublic;

  // --- SZŰRÉS ÉS RENDEZÉS LOGIKA ---
  const visibleUsers = useMemo(() => {
    // 1. Alap lista másolata
    let filtered = [...users];

    // 2. Ha DM mód van, KIVESSZÜK magunkat a listából
    if (isDm) {
        filtered = filtered.filter(u => u.id !== currentUser.id);
    }

    // 3. Rendezés (Csoportnál magunkat előre, amúgy névsor)
    return filtered.sort((a, b) => {
      if (a.id === currentUser.id) return -1;
      if (b.id === currentUser.id) return 1;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [users, currentUser.id, isDm]); // Függőségek: ha a mód változik, újra számol

  useEffect(() => {
    if (isOpen) {
      setGroupName("");
      // Csak csoportnál jelöljük ki magunkat
      if (isGroup && currentUser) {
          setSelectedUserIds([currentUser.id]);
      } else {
          setSelectedUserIds([]);
      }
    }
  }, [isOpen, isGroup, currentUser]);

  if (!isOpen) return null;

  const handleToggleUser = (userId: string) => {
    if (isGroup && userId === currentUser.id) {
        return; 
    }
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateGroup = () => {
    const isValid = isPublic 
      ? groupName.trim().length > 0 
      : (groupName.trim().length > 0 && selectedUserIds.length > 1);

    if (isValid) {
      const idsToSend = selectedUserIds.filter(id => id !== currentUser.id);
      onCreateGroup(groupName, idsToSend);
    }
  };

  const getTitle = () => {
    if (isDm) return "Új beszélgetés";
    if (isPublic) return "Új publikus szoba";
    return "Új privát csoport";
  };

  const isButtonDisabled = () => {
    if (isPublic) return !groupName.trim();
    return !groupName.trim() || selectedUserIds.length < 2;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        
        {/* HEADER */}
        <div className="modal-header">
          <h3 className="modal-title">{getTitle()}</h3>
          <button onClick={onClose} className="modal-close">✕</button>
        </div>

        {/* INPUT */}
        {showNameInput && (
          <div style={{ padding: "24px 24px 0 24px" }}>
            <label className="modal-section-label" style={{padding: 0, marginBottom: "8px"}}>SZOBA NEVE</label>
            <input 
                type="text" 
                className="form-input"
                placeholder={isPublic ? "pl. Általános csevegő" : "pl. Fejlesztői Csapat"} 
                value={groupName} 
                onChange={(e) => setGroupName(e.target.value)} 
                autoFocus 
            />
          </div>
        )}

        {error && <div className="error-banner" style={{ margin: "16px 24px 0 24px" }}>{error}</div>}

        {/* LISTA */}
        {isPublic ? (
          <div style={{ padding: "32px 24px", textAlign: "center", color: "#888" }}>
            <div style={{ width: "60px", height: "60px", margin: "0 auto 16px auto", borderRadius: "50%", backgroundColor: "#2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", color: "#A1DD29" }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>
            </div>
            <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.5" }}>Ez egy nyilvános szoba lesz.<br/>A létrehozás után bárki szabadon csatlakozhat hozzá.</p>
          </div>
        ) : (
          <>
            <div style={{ padding: "16px 24px 8px 24px" }}>
              <span className="modal-section-label">
                {isGroup ? "TAGOK KIVÁLASZTÁSA" : "ELÉRHETŐ FELHASZNÁLÓK"}
              </span>
            </div>

            <div className="modal-body custom-scroll">
              {/* ITT MOST MÁR A SZŰRT LISTÁT (visibleUsers) HASZNÁLJUK */}
              {visibleUsers.map((u) => {
                const initial = u.displayName.charAt(0).toUpperCase();
                const isMe = isGroup && u.id === currentUser.id;
                const isSelected = selectedUserIds.includes(u.id);

                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      if (isDm) onSelectUser(u);
                      else handleToggleUser(u.id);
                    }}
                    disabled={isMe}
                    className={`user-select-item ${isSelected ? 'is-selected' : ''}`}
                  >
                    <div style={{ position: "relative" }}>
                      <div className="avatar" style={{width: "40px", height: "40px", fontSize: "16px"}}>{initial}</div>
                      {u.isOnline && <div className="online-indicator" />}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: "#f5f5f5" }}>
                            {u.displayName} {isMe && "(Te)"}
                        </span>
                        
                        {isGroup && (
                          <div className="checkbox">
                            {isSelected && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            )}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: "12px", color: "#888" }}>@{u.userName}</div>
                    </div>
                  </button>
                );
              })}
              {users.length === 0 && !error && <p style={{ textAlign: "center", color: "#666", fontSize: "13px", marginTop: "20px" }}>Nincs elérhető felhasználó.</p>}
            </div>
          </>
        )}

        {showNameInput && (
          <div className="modal-footer">
            <button 
                onClick={handleCreateGroup} 
                disabled={isButtonDisabled()} 
                className={`create-group-btn ${!isButtonDisabled() ? 'active' : ''}`}
            >
              {isPublic ? "Szoba létrehozása" : "Csoport létrehozása"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}