import { useCallback, useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { fetchMessagesForRoom } from "./api/messages";
import { api } from "./api/client";
import { getUserByUserName, getAllUsers } from "./api/users";
import { AppLayout } from "./components/layout/AppLayout";
import { RoomsList } from "./components/rooms/RoomsList";
import { ChatWindow } from "./components/chat/ChatWindow";
import { UsersModal } from "./components/users/UsersModal";
import { LoginForm } from "./components/auth/LoginForm";
import { useSignalR } from "./hooks/useSignalR";
import { usePresence } from "./hooks/usePresence";
import { useTyping } from "./hooks/useTyping";
import type { ChatRoom, RoomForUserDto } from "./types/room";
import type { ChatMessageDto, UiMessage } from "./types/message";
import type { CurrentUser, UserWithPresence } from "./types/user";

const LOCAL_STORAGE_USER_KEY = "rtc_current_user";

function App() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const currentUserRef = useRef<CurrentUser | null>(null);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const [loginUserName, setLoginUserName] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const [allUsers, setAllUsers] = useState<UserWithPresence[]>([]);
  const [isUserListOpen, setIsUserListOpen] = useState(false);
  const [userListError, setUserListError] = useState<string | null>(null);

  const {
    handleInitialOnlineUsers,
    handleUserOnline,
    handleUserOffline,
    resetPresence,
    mapUsersWithPresence,
  } = usePresence();

  const { typingUsers, handleRemoteTyping, handleLocalTyping, resetTyping } = useTyping(
    currentUser,
    selectedRoomId
  );

  useEffect(() => {
    setAllUsers((prev) => mapUsersWithPresence(prev));
  }, [mapUsersWithPresence]);

  const handleMessageReceived = useCallback((msg: ChatMessageDto) => {
    const userId = currentUserRef.current?.id;
    setMessages((prev) => [
      ...prev,
      {
        ...msg,
        isOwn: userId ? msg.senderId.toLowerCase() === userId.toLowerCase() : false,
      },
    ]);
  }, []);

  const {
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    sendRoomMessage,
    sendTypingStatus,
  } = useSignalR({
    onMessageReceived: handleMessageReceived,
    onUserTyping: handleRemoteTyping,
    onInitialOnlineUsers: handleInitialOnlineUsers,
    onUserOnline: handleUserOnline,
    onUserOffline: handleUserOffline,
  });

  const resetSessionState = useCallback(() => {
    setMessages([]);
    resetTyping();
    setRooms([]);
    setSelectedRoomId(null);
    setMessageInput("");
    resetPresence();
    setAllUsers([]);
  }, [resetPresence, resetTyping]);

  const loadHistoryForRoom = useCallback(
    async (roomId: string, userId: string) => {
      try {
        const history = await fetchMessagesForRoom(roomId);
        if (!Array.isArray(history)) {
          console.warn("Unexpected history payload, falling back to empty array", history);
          setMessages([]);
          return;
        }

        setMessages(
          history.map((m) => ({
            ...m,
            isOwn: m.senderId.toLowerCase() === userId.toLowerCase(),
          }))
        );
      } catch (err) {
        console.error("History load error:", err);
        setMessages([]);
      }
    },
    []
  );

  const initializeForUser = useCallback(
    async (user: CurrentUser) => {
      setIsInitializing(true);
      resetSessionState();
      currentUserRef.current = user;
      setCurrentUser(user);

      try {
        await connect(user.id);

        const roomsRes = await api.get<RoomForUserDto[]>(
          `/api/rooms/for-user/${user.id}`
        );

        const roomDtos = Array.isArray(roomsRes.data) ? roomsRes.data : [];

        if (!Array.isArray(roomsRes.data)) {
          console.warn("Unexpected rooms payload, using empty list instead.", roomsRes.data);
        }

        const mappedRooms: ChatRoom[] = roomDtos.map((r) => ({
          id: r.id,
          name: r.name,
          isPrivate: r.isPrivate,
          otherUserId: r.otherUserId ?? undefined,
          otherDisplayName: r.otherDisplayName ?? undefined,
        }));

        setRooms(mappedRooms);

        if (mappedRooms.length > 0) {
          const first = mappedRooms[0];
          setSelectedRoomId(first.id);
          await joinRoom(first.id);
          await loadHistoryForRoom(first.id, user.id);
        }
      } catch (err) {
        console.error("SignalR init error:", err);
        setLoginError("Nem sikerült csatlakozni a chat szerverhez.");
      } finally {
        setIsInitializing(false);
      }
    },
    [connect, joinRoom, loadHistoryForRoom, resetSessionState]
  );

  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CurrentUser;
        if (parsed.id && parsed.userName) {
          void initializeForUser(parsed);
        }
      } catch {
        localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
      }
    }
  }, [initializeForUser]);

  const handleLogin = useCallback(async () => {
    setLoginError(null);

    const trimmed = loginUserName.trim();
    if (!trimmed) {
      setLoginError("Add meg a felhasználónevet.");
      return;
    }

    try {
      setIsInitializing(true);
      const dto = await getUserByUserName(trimmed);

      const user: CurrentUser = {
        id: dto.id,
        userName: dto.userName,
        displayName: dto.displayName,
      };

      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
      await initializeForUser(user);
    } catch (err: unknown) {
      console.error("Login error:", err);
      const status = isAxiosError(err) ? err.response?.status : undefined;

      if (status === 404) {
        setLoginError("Nincs ilyen felhasználó.");
      } else {
        setLoginError("Váratlan hiba történt bejelentkezés közben.");
      }
    } finally {
      setIsInitializing(false);
    }
  }, [initializeForUser, loginUserName]);

  const handleLogout = useCallback(async () => {
    await disconnect();
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    setCurrentUser(null);
    resetSessionState();
  }, [disconnect, resetSessionState]);

  const handleRoomClick = useCallback(
    async (roomId: string) => {
      if (!currentUser) return;
      if (roomId === selectedRoomId) return;

      const previousRoomId = selectedRoomId;
      setSelectedRoomId(roomId);
      setMessages([]);
      resetTyping();

      if (previousRoomId) {
        try {
          await leaveRoom(previousRoomId);
        } catch (err) {
          console.warn("LeaveRoom error (ignored):", err);
        }
      }

      await joinRoom(roomId);
      await loadHistoryForRoom(roomId, currentUser.id);
    },
    [currentUser, joinRoom, leaveRoom, loadHistoryForRoom, resetTyping, selectedRoomId]
  );

  const handleSend = useCallback(async () => {
    if (!messageInput.trim() || !currentUser || !selectedRoomId) {
      return;
    }

    const content = messageInput.trim();
    setMessageInput("");

    try {
      await sendRoomMessage(selectedRoomId, currentUser.id, content);
    } catch (err) {
      console.error("SendMessageToRoom error:", err);
    }
  }, [currentUser, messageInput, selectedRoomId, sendRoomMessage]);

  const handleInputChange = useCallback(
    (value: string) => {
      setMessageInput(value);
      void handleLocalTyping(value, sendTypingStatus);
    },
    [handleLocalTyping, sendTypingStatus]
  );

  const openUserList = useCallback(async () => {
    if (!currentUser) return;
    setUserListError(null);

    try {
      const users = await getAllUsers();
      const safeUsers = Array.isArray(users) ? users : [];

      if (!Array.isArray(users)) {
        console.warn("Unexpected users payload, using empty list instead.", users);
      }

      const filtered = safeUsers.filter((u) => u.id !== currentUser.id);
      const mapped = mapUsersWithPresence(filtered);

      setAllUsers(mapped);
      setIsUserListOpen(true);
    } catch (err) {
      console.error("getAllUsers error:", err);
      setUserListError("Nem sikerült betölteni a felhasználókat.");
      setIsUserListOpen(true);
    }
  }, [currentUser, mapUsersWithPresence]);

  const handleOpenDmWith = useCallback(
    async (target: UserWithPresence) => {
      if (!currentUser) return;

      try {
        const res = await api.post<RoomForUserDto>("/api/rooms/direct", null, {
          params: {
            userId: currentUser.id,
            targetUserId: target.id,
          },
        });

        const r = res.data;

        const dmRoom: ChatRoom = {
          id: r.id,
          name: r.name,
          isPrivate: r.isPrivate,
          otherUserId: r.otherUserId ?? target.id,
          otherDisplayName: r.otherDisplayName ?? target.displayName,
        };

        setRooms((prev) => {
          const exists = prev.find((x) => x.id === dmRoom.id);
          if (exists) return prev;
          return [...prev, dmRoom];
        });

        setIsUserListOpen(false);
        await handleRoomClick(dmRoom.id);
      } catch (err) {
        console.error("DM open error:", err);
        setUserListError("Nem sikerült megnyitni a privát beszélgetést.");
      }
    },
    [currentUser, handleRoomClick]
  );

  const activeRoom = rooms.find((r) => r.id === selectedRoomId);
  const activeRoomLabel =
    activeRoom && activeRoom.isPrivate && activeRoom.otherDisplayName
      ? `DM: ${activeRoom.otherDisplayName}`
      : activeRoom?.name ?? "Room";

  if (!currentUser) {
    return (
      <LoginForm
        userName={loginUserName}
        onUserNameChange={setLoginUserName}
        onLogin={handleLogin}
        error={loginError}
        isLoading={isInitializing}
      />
    );
  }

  return (
    <AppLayout currentUser={currentUser} onLogout={handleLogout}>
      <div style={{ display: "flex", gap: "24px" }}>
        <RoomsList
          rooms={rooms}
          selectedRoomId={selectedRoomId}
          onSelectRoom={(id) => void handleRoomClick(id)}
          onOpenUsers={() => void openUserList()}
        />

        <ChatWindow
          activeRoomLabel={activeRoomLabel}
          messages={messages}
          typingUsers={typingUsers}
          messageInput={messageInput}
          onMessageInputChange={handleInputChange}
          onSendMessage={() => void handleSend()}
        />
      </div>

      <UsersModal
        isOpen={isUserListOpen}
        users={allUsers}
        error={userListError}
        onClose={() => setIsUserListOpen(false)}
        onSelectUser={(user) => void handleOpenDmWith(user)}
      />
    </AppLayout>
  );
}

export default App;
