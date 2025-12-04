import { useState, useEffect } from "react";
import { getUserByUserName } from "./api/users";
import type { CurrentUser } from "./types";
import { useChat } from "./hooks/useChat"; // A te fájlod neve useChat.ts!

// A te fájljaid nevei a components mappában (a képed alapján):
import { LoginScreen } from "./components/LoginScreen";
import { Sidebar } from "./components/Sidebar";
import { ChatArea } from "./components/ChatArea";
import { UserListModal } from "./components/UserListModal";

const LOCAL_STORAGE_USER_KEY = "rtc_current_user";

function App() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  // Itt hívjuk meg a useChat hookot, ami nálad létezik
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
    <div style={{ minHeight: "100vh", backgroundColor: "#111", color: "#f5f5f5", display: "flex", justifyContent: "center", padding: "32px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "960px", width: "100%" }}>
        
        {/* Header */}
        <h1 style={{ fontSize: "32px", marginBottom: "8px" }}>Real-Time Chat</h1>
        <p style={{ marginBottom: "16px", color: "#aaa" }}>
          Bejelentkezve mint: <strong>{currentUser.displayName}</strong>
          <button onClick={handleLogout} style={{ marginLeft: "12px", padding: "4px 10px", borderRadius: "999px", border: "none", backgroundColor: "#7C58DC", color: "#fff", cursor: "pointer", fontSize: "12px" }}>
            Kijelentkezés
          </button>
        </p>

        {/* Main Layout */}
        <div style={{ display: "flex", gap: "24px" }}>
          {/* A Sidebar komponenst használjuk a RoomsList helyett */}
          <Sidebar 
            rooms={chat.rooms} 
            selectedRoomId={chat.selectedRoomId} 
            onSelectRoom={chat.switchRoom} 
            onOpenUserList={chat.openUserList} 
          />
          
          {/* A ChatArea komponenst használjuk a ChatWindow helyett */}
          <ChatArea 
            activeRoom={chat.rooms.find(r => r.id === chat.selectedRoomId)}
            messages={chat.messages}
            typingUsers={chat.typingUsers}
            onSendMessage={chat.sendMessage}
            onTyping={chat.handleInputTyping}
          />
        </div>

        {/* UserListModal */}
        <UserListModal 
          isOpen={chat.isUserListOpen}
          onClose={() => chat.setIsUserListOpen(false)}
          users={chat.allUsers}
          onSelectUser={chat.startDm}
          error={chat.userListError}
        />
      </div>
    </div>
  );
}

export default App;