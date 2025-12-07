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

    const participantIds = (activeRoom.participantIds || []).map(id => id.toLowerCase());
    const availableUsersToAdd = allUsers.filter(u => !participantIds.includes(u.id.toLowerCase()));
    const currentMembers = allUsers.filter(u => participantIds.includes(u.id.toLowerCase()));

    const handleAddUser = () => {
        if (!selectedUserToAdd) return;
        onAddMember(activeRoom.id, selectedUserToAdd);
        setSelectedUserToAdd("");
    };

    return (
        <div className="admin-panel">
            {/* FEJLÉC */}
            <div className="admin-header">
                <h3 className="admin-title">Csoport kezelése</h3>
                <button onClick={onClose} className="close-btn" title="Bezárás">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>

            {/* TAG HOZZÁADÁSA */}
            <div style={{ marginBottom: "24px" }}>
                <label className="admin-label">Új tag felvétele</label>
                
                <div className="admin-card">
                    {/* DROPDOWN */}
                    <div style={{ position: "relative" }}>
                        <div 
                            className={`dropdown-trigger ${isDropdownOpen ? 'active' : ''}`}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
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

                        {isDropdownOpen && (
                            <>
                                <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setIsDropdownOpen(false)} />
                                <div className="dropdown-menu custom-scroll">
                                    {availableUsersToAdd.length === 0 ? (
                                        <div style={{ padding: "16px", color: "#555", fontSize: "13px", textAlign: "center" }}>
                                            Nincs hozzáadható felhasználó.
                                        </div>
                                    ) : (
                                        availableUsersToAdd.map(u => (
                                            <div 
                                                key={u.id}
                                                className="dropdown-item"
                                                onClick={() => {
                                                    setSelectedUserToAdd(u.id);
                                                    setIsDropdownOpen(false);
                                                }}
                                            >
                                                <div className="mini-avatar">
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

                    <button 
                        onClick={handleAddUser}
                        disabled={!selectedUserToAdd}
                        className={`add-btn ${selectedUserToAdd ? 'active' : ''}`}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        HOZZÁADÁS
                    </button>
                </div>
            </div>

            {/* TAGOK LISTÁJA */}
            <div className="custom-scroll" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                <label className="admin-label">Jelenlegi tagok ({currentMembers.length})</label>
                
                <div className="member-list">
                    {currentMembers.map(member => (
                        <div key={member.id} className="member-item">
                            <div className="avatar" style={{ width: "32px", height: "32px", fontSize: "14px" }}>
                                {member.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="member-name">{member.displayName}</div>
                                {member.id === currentUserId && <div className="member-you">Te</div>}
                            </div>
                            
                            {member.id !== currentUserId && (
                                <button 
                                    onClick={() => onRemoveMember(activeRoom.id, member.id)}
                                    title="Eltávolítás"
                                    className="kick-btn"
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