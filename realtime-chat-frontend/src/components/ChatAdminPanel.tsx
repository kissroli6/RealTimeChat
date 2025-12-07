import { useState } from "react";
import type { ChatRoom } from "../types";

type SimpleUser = {
    id: string;
    displayName: string;
}

interface ChatAdminPanelProps {
    activeRoom: ChatRoom;
    currentUserId: string;
    allUsers: SimpleUser[];
    onAddMember: (roomId: string, userId: string) => void;
    onRemoveMember: (roomId: string, userId: string) => void;
    onClose: () => void;
}

export function ChatAdminPanel({ 
    activeRoom, 
    currentUserId, 
    allUsers, 
    onAddMember, 
    onRemoveMember,
    onClose 
}: ChatAdminPanelProps) {
    
    const [selectedUserToAdd, setSelectedUserToAdd] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // --- ADATOK SZŰRÉSE ---
    // Biztosítjuk, hogy a participantIds létezzen és kisbetűs legyen az összehasonlításhoz
    const participantIds = (activeRoom.participantIds || []).map(id => id.toLowerCase());

    const availableUsersToAdd = allUsers.filter(u => !participantIds.includes(u.id.toLowerCase()));
    const currentMembers = allUsers.filter(u => participantIds.includes(u.id.toLowerCase()));

    const handleAddUser = () => {
        if (!selectedUserToAdd) return;
        onAddMember(activeRoom.id, selectedUserToAdd);
        setSelectedUserToAdd("");
    };

    return (
        <div style={{ 
            width: "280px", // Kicsit szélesebb a kényelemért
            borderLeft: "1px solid #222", 
            backgroundColor: "#111", 
            display: "flex", 
            flexDirection: "column",
            padding: "20px",
            animation: "slideIn 0.3s ease-out",
            height: "100%",
            boxSizing: "border-box"
        }}>
            <style>{`
                @keyframes slideIn {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                /* Görgetősáv stilizálása */
                .custom-scroll::-webkit-scrollbar { width: 6px; }
                .custom-scroll::-webkit-scrollbar-track { background: transparent; }
                .custom-scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
            `}</style>

            {/* --- FEJLÉC --- */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #2a2a2a", paddingBottom: "16px", marginBottom: "20px" }}>
                <h3 style={{ margin: 0, fontSize: "16px", color: "#f5f5f5", fontWeight: "700" }}>
                    Csoport kezelése
                </h3>
                <button 
                    onClick={onClose} 
                    style={{ background: "transparent", border: "none", color: "#666", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }}
                    title="Bezárás"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>

            {/* --- 1. TAG HOZZÁADÁSA (CUSTOM DROPDOWN) --- */}
            <div style={{ marginBottom: "24px" }}>
                <label style={{ fontSize: "11px", color: "#777", fontWeight: "bold", display: "block", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Új tag felvétele
                </label>
                
                <div style={{ 
                    backgroundColor: "#161616", 
                    padding: "16px", 
                    borderRadius: "16px", 
                    border: "1px solid #2a2a2a",
                    display: "flex", flexDirection: "column", gap: "12px"
                }}>
                    
                    {/* EGYEDI DROPDOWN */}
                    <div style={{ position: "relative" }}>
                        {/* A látható "Select" mező */}
                        <div 
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            style={{ 
                                width: "100%",
                                padding: "12px 16px",
                                borderRadius: "10px", 
                                backgroundColor: "#0a0a0a", 
                                border: isDropdownOpen ? "1px solid #7C58DC" : "1px solid #333", // Aktív szín
                                color: selectedUserToAdd ? "#fff" : "#777", 
                                cursor: "pointer",
                                fontSize: "13px",
                                fontWeight: "500",
                                display: "flex", justifyContent: "space-between", alignItems: "center",
                                transition: "all 0.2s",
                                boxSizing: "border-box"
                            }}
                        >
                            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {selectedUserToAdd 
                                    ? availableUsersToAdd.find(u => u.id === selectedUserToAdd)?.displayName 
                                    : "Válassz felhasználót..."}
                            </span>
                            <div style={{ transform: isDropdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", color: "#777", display: "flex" }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </div>
                        </div>

                        {/* A Lenyíló Lista (Div-ekből építve) */}
                        {isDropdownOpen && (
                            <>
                                {/* Láthatatlan réteg a bezáráshoz ha mellékattintasz */}
                                <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setIsDropdownOpen(false)} />
                                
                                <div className="custom-scroll" style={{ 
                                    position: "absolute", 
                                    top: "calc(100% + 8px)", 
                                    left: 0, right: 0,
                                    backgroundColor: "#1a1a1a", 
                                    border: "1px solid #333",
                                    borderRadius: "12px",
                                    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                                    zIndex: 100, 
                                    maxHeight: "240px", 
                                    overflowY: "auto",
                                    padding: "6px"
                                }}>
                                    {availableUsersToAdd.length === 0 ? (
                                        <div style={{ padding: "16px", color: "#555", fontSize: "13px", textAlign: "center" }}>
                                            Nincs hozzáadható felhasználó.
                                        </div>
                                    ) : (
                                        availableUsersToAdd.map(u => (
                                            <div 
                                                key={u.id}
                                                onClick={() => {
                                                    setSelectedUserToAdd(u.id);
                                                    setIsDropdownOpen(false);
                                                }}
                                                // Inline hover (JS trükk helyett CSS class jobb lenne, de így gyorsabb)
                                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#2a2a2a"; e.currentTarget.style.color = "#fff"; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#aaa"; }}
                                                style={{
                                                    padding: "8px 12px",
                                                    borderRadius: "8px",
                                                    cursor: "pointer",
                                                    color: "#aaa",
                                                    fontSize: "13px",
                                                    transition: "all 0.1s",
                                                    display: "flex", alignItems: "center", gap: "10px",
                                                    marginBottom: "2px"
                                                }}
                                            >
                                                {/* Mini Avatar a listában */}
                                                <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#333", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "bold", color: "#fff" }}>
                                                    {u.displayName.charAt(0).toUpperCase()}
                                                </div>
                                                {u.displayName}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Hozzáadás Gomb */}
                    <button 
                        onClick={handleAddUser}
                        disabled={!selectedUserToAdd}
                        style={{ 
                            width: "100%",
                            padding: "12px", 
                            borderRadius: "10px", 
                            backgroundColor: selectedUserToAdd ? "#9FD633" : "#2a2a2a",
                            color: selectedUserToAdd ? "#111" : "#555", 
                            border: "none", 
                            cursor: selectedUserToAdd ? "pointer" : "not-allowed",
                            fontWeight: "800",
                            fontSize: "13px",
                            transition: "all 0.2s",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        HOZZÁADÁS
                    </button>
                </div>
            </div>

            {/* --- 2. TAGOK LISTÁJA --- */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }} className="custom-scroll">
                <label style={{ fontSize: "11px", color: "#777", fontWeight: "bold", display: "block", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Jelenlegi tagok ({currentMembers.length})
                </label>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {currentMembers.map(member => (
                        <div key={member.id} style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            gap: "12px", 
                            padding: "10px 12px", 
                            backgroundColor: "#161616", 
                            borderRadius: "12px",
                            border: "1px solid #2a2a2a",
                            transition: "border-color 0.2s"
                        }}>
                            
                            {/* Profilkép */}
                            <div style={{ 
                                width: "32px", height: "32px", 
                                borderRadius: "50%", 
                                backgroundColor: "#333", 
                                color: "#fff",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontWeight: "bold", fontSize: "14px",
                                flexShrink: 0
                            }}>
                                {member.displayName.charAt(0).toUpperCase()}
                            </div>

                            {/* Név */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: "14px", color: "#eee", fontWeight: "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {member.displayName}
                                </div>
                                {member.id === currentUserId && <div style={{ fontSize: "10px", color: "#666", marginTop: "2px" }}>Te</div>}
                            </div>
                            
                            {/* Kirúgás Gomb */}
                            {member.id !== currentUserId && (
                                <button 
                                    onClick={() => onRemoveMember(activeRoom.id, member.id)}
                                    title="Eltávolítás"
                                    style={{ 
                                        backgroundColor: "rgba(255, 107, 107, 0.1)",
                                        border: "none", 
                                        borderRadius: "6px",
                                        color: "#ff6b6b", 
                                        cursor: "pointer", 
                                        fontWeight: "700",
                                        fontSize: "10px",
                                        padding: "6px 10px",
                                        textTransform: "uppercase",
                                        transition: "all 0.2s"
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 107, 107, 0.2)"}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 107, 107, 0.1)"}
                                >
                                    Kirúgás
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}