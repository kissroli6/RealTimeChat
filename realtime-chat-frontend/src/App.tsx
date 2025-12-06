import { useState, useEffect } from "react";
import { getUserByUserName } from "./api/users";
import type { CurrentUser } from "./types";
import { useChat } from "./hooks/useChat";

import { LoginScreen } from "./components/LoginScreen";
import { Sidebar } from "./components/Sidebar";
import { ChatArea } from "./components/ChatArea";
import { UserListModal } from "./components/UserListModal";

const LOCAL_STORAGE_USER_KEY = "rtc_current_user";

function App() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  const chat = useChat(currentUser);

  // --- Auth Logic ---
  
  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
      }
    }
  }, []);

  const handleLogin = async (userName: string) => {
    setLoginError(null);
    setIsLoginLoading(true);
    try {
      const dto = await getUserByUserName(userName);
      const user: CurrentUser = { id: dto.id, userName: dto.userName, displayName: dto.displayName };
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
      setCurrentUser(user);
    } catch (err: any) {
      setLoginError(err?.response?.status === 404 ? "Nincs ilyen felhasználó." : "Hiba történt.");
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    setCurrentUser(null);
  };

  // --- Render ---

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} isLoading={isLoginLoading} error={loginError} />;
  }

  return (
    <div style={{ 
      height: "100vh", 
      width: "100vw",
      background: "linear-gradient(135deg, #1a1a2e 0%, #000000 50%, #0f1c0f 100%)",
      color: "#f5f5f5", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      fontFamily: "'Inter', system-ui, sans-serif",
      overflow: "hidden"
    }}>
      
      <div style={{ 
        width: "100%", 
        maxWidth: "1200px", 
        height: "90vh", 
        display: "flex", 
        gap: "16px", 
        padding: "0 20px"
      }}>
        
        {/* Sidebar Wrapper */}
        <div style={{ width: "320px", flexShrink: 0, display: "flex", flexDirection: "column" }}>
           <Sidebar 
            rooms={chat.rooms} 
            selectedRoomId={chat.selectedRoomId} 
            onSelectRoom={chat.switchRoom} 
            onOpenUserList={chat.openUserList} // Most már átveszi a módot
            currentUser={currentUser}
            onLogout={handleLogout}
          />
        </div>
        
        {/* Chat Area Wrapper */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <ChatArea 
            activeRoom={chat.rooms.find(r => r.id === chat.selectedRoomId)}
            messages={chat.messages}
            typingUsers={chat.typingUsers}
            onSendMessage={chat.sendMessage}
            onTyping={chat.handleInputTyping}
          />
        </div>

        {/* UserListModal - Frissítve az új funkciókkal */}
        <UserListModal 
          isOpen={chat.isUserListOpen}
          onClose={() => chat.setIsUserListOpen(false)}
          users={chat.allUsers}
          mode={chat.userListMode} // Átadjuk a módot (DM vagy GROUP)
          onSelectUser={chat.startDm} // DM callback
          onCreateGroup={chat.createGroup} // Group callback
          error={chat.userListError}
        />
      </div>
    </div>
  );
}

export default App;