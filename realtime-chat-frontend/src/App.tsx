import { useState, useEffect } from "react";
// Importáljuk a szükséges API hívásokat (createUser hozzáadva!)
import { getUserByUserName, createUser } from "./api/users";
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

  // A hook inicializálása
  const chat = useChat(currentUser);

  // --- Auth Logic (Bejelentkezés ellenőrzése induláskor) ---
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

  // BEJELENTKEZÉS
  const handleLogin = async (userName: string) => {
    setLoginError(null);
    setIsLoginLoading(true);
    try {
      const dto = await getUserByUserName(userName);
      const user: CurrentUser = { id: dto.id, userName: dto.userName, displayName: dto.displayName };
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
      setCurrentUser(user);
    } catch (err: any) {
      // Ha 404, akkor nincs ilyen user
      setLoginError(err?.response?.status === 404 ? "Nincs ilyen felhasználó. Regisztrálj!" : "Hiba történt.");
    } finally {
      setIsLoginLoading(false);
    }
  };

  // ✅ ÚJ: REGISZTRÁCIÓ
  const handleRegister = async (userName: string, displayName: string) => {
    setLoginError(null);
    setIsLoginLoading(true);
    try {
      // 1. Létrehozzuk a felhasználót a backend-en
      const dto = await createUser(userName, displayName);
      
      // 2. Azonnal be is léptetjük (elmentjük lokálisan)
      const user: CurrentUser = { id: dto.id, userName: dto.userName, displayName: dto.displayName };
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
      setCurrentUser(user);
    } catch (err: any) {
        // Ha 409 Conflict, akkor már van ilyen név
        if (err?.response?.status === 409) {
            setLoginError("Ez a felhasználónév már foglalt. Válassz másikat!");
        } else {
            setLoginError("Hiba történt a regisztráció során.");
        }
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    setCurrentUser(null);
  };

  // --- Render ---

  // Ha nincs bejelentkezve, akkor a LoginScreen-t mutatjuk
  if (!currentUser) {
    return (
        <LoginScreen 
            onLogin={handleLogin} 
            onRegister={handleRegister} // <--- EZ HIÁNYZOTT AZ ELŐBB!
            isLoading={isLoginLoading} 
            error={loginError} 
        />
    );
  }

  // Ha be van jelentkezve, akkor a fő alkalmazást
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
            onOpenUserList={chat.openUserList}
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
            
            // Props bekötése az admin funkciókhoz
            currentUserId={currentUser.id} 
            allUsers={chat.allUsers}       
            onAddMember={chat.addMemberToGroup}      
            onRemoveMember={chat.removeMemberFromGroup} 
          />
        </div>

        {/* UserListModal - Modal ablak új beszélgetésekhez */}
        <UserListModal 
          isOpen={chat.isUserListOpen}
          onClose={() => chat.setIsUserListOpen(false)}
          users={chat.allUsers}
          mode={chat.userListMode}
          onSelectUser={chat.startDm}
          onCreateGroup={chat.createGroup}
          error={chat.userListError}
          currentUser={currentUser} 
        />
      </div>
    </div>
  );
}

export default App;