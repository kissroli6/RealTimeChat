import { useState, useEffect } from "react";
import { getUserByUserName, createUser } from "./api/users";
import type { CurrentUser } from "./types";
import { useChat } from "./hooks/useChat";
import { LoginScreen } from "./components/LoginScreen";
import { Sidebar } from "./components/Sidebar";
import { ChatArea } from "./components/ChatArea";
import { UserListModal } from "./components/UserListModal";
import "./App.css"; 

const LOCAL_STORAGE_USER_KEY = "rtc_current_user";

function App() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const chat = useChat(currentUser);

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
      setLoginError(err?.response?.status === 404 ? "Nincs ilyen felhasználó. Regisztrálj!" : "Hiba történt.");
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleRegister = async (userName: string, displayName: string) => {
    setLoginError(null);
    setIsLoginLoading(true);
    try {
      const dto = await createUser(userName, displayName);
      const user: CurrentUser = { id: dto.id, userName: dto.userName, displayName: dto.displayName };
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
      setCurrentUser(user);
    } catch (err: any) {
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

  if (!currentUser) {
    return (
        <LoginScreen 
            onLogin={handleLogin} 
            onRegister={handleRegister} 
            isLoading={isLoginLoading} 
            error={loginError} 
        />
    );
  }

  return (
    <div className="app-container"> 
        <div className="app-layout"> 
           
           <div className="sidebar-wrapper">
              <Sidebar 
                rooms={chat.rooms} 
                selectedRoomId={chat.selectedRoomId} 
                onSelectRoom={chat.switchRoom} 
                onOpenUserList={chat.openUserList}
                currentUser={currentUser}
                onLogout={handleLogout}
              />
           </div>
            
           <div className="chat-wrapper">
              <ChatArea 
                activeRoom={chat.rooms.find(r => r.id === chat.selectedRoomId)}
                messages={chat.messages}
                typingUsers={chat.typingUsers}
                onSendMessage={chat.sendMessage}
                onTyping={chat.handleInputTyping}
                currentUserId={currentUser.id} 
                allUsers={chat.allUsers}       
                onAddMember={chat.addMemberToGroup}      
                onRemoveMember={chat.removeMemberFromGroup} 
              />
           </div>

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