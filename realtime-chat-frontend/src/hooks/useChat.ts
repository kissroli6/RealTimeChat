import { useState, useRef, useEffect } from "react";

// JAVÍTOTT IMPORT:
import {
  // Ezek FÜGGVÉNYEK (kell a kódjuk, nem lehet előttük 'type'):
  startConnection,
  registerUser,
  joinRoom,
  leaveRoom,
  sendMessageToRoom,
  onMessageReceived,
  onUserTyping,
  sendTyping,
  onInitialOnlineUsers,
  onUserOnline,
  onUserOffline,
  stopConnection,
  // Ezek TÍPUSOK (csak leírások, ezek elé KELL a 'type'):
  type ChatMessageDto,
  type TypingEvent,
} from "../lib/signalrClient";

import { api } from "../api/client";
import { fetchMessagesForRoom } from "../api/messages";
import { getAllUsers } from "../api/users";

// Itt minden TÍPUS, szóval itt maradhat a 'import type' vagy a { type ... }
import type { 
  RoomForUserDto, 
  ChatRoom, 
  UiMessage, 
  CurrentUser, 
  UserWithPresence 
} from "../types";

export function useChat(currentUser: CurrentUser | null) {
  // --- State ---
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  
  // Presence state
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<UserWithPresence[]>([]);
  
  // UI state
  const [isInitializing, setIsInitializing] = useState(false);
  const [isUserListOpen, setIsUserListOpen] = useState(false);
  const [userListError, setUserListError] = useState<string | null>(null);

  // Refs
  const typingTimeoutRef = useRef<number | null>(null);
  const isTypingRef = useRef(false);
  const selectedRoomRef = useRef<string | null>(selectedRoomId);

  useEffect(() => {
    selectedRoomRef.current = selectedRoomId;
  }, [selectedRoomId]);

  // --- Handlers ---

  const handleInitialOnlineUsers = (userIds: string[]) => {
    setOnlineUserIds(userIds);
    setAllUsers((prev) =>
      prev.map((u) => ({ ...u, isOnline: userIds.some((id) => id.toLowerCase() === u.id.toLowerCase()) }))
    );
  };

  const handleUserOnline = (userId: string) => {
    setOnlineUserIds((prev) => {
      if (prev.some((id) => id.toLowerCase() === userId.toLowerCase())) return prev;
      return [...prev, userId];
    });
    setAllUsers((prev) =>
      prev.map((u) => (u.id.toLowerCase() === userId.toLowerCase() ? { ...u, isOnline: true } : u))
    );
  };

  const handleUserOffline = (userId: string) => {
    setOnlineUserIds((prev) => prev.filter((id) => id.toLowerCase() !== userId.toLowerCase()));
    setAllUsers((prev) =>
      prev.map((u) => (u.id.toLowerCase() === userId.toLowerCase() ? { ...u, isOnline: false } : u))
    );
  };

  // --- Init Logic ---
  const initForUser = async (user: CurrentUser) => {
    setIsInitializing(true);
    setMessages([]);
    setTypingUsers([]);
    setRooms([]);
    setSelectedRoomId(null);
    selectedRoomRef.current = null;
    setOnlineUserIds([]);

    try {
      await startConnection();
      await registerUser(user.id);

      onMessageReceived((msg: ChatMessageDto) => {
        setMessages((prev) => [
          ...prev,
          { ...msg, isOwn: msg.senderId.toLowerCase() === user.id.toLowerCase() },
        ]);
      });

      onUserTyping((ev: TypingEvent) => {
        const currentRoomId = selectedRoomRef.current;
        if (!currentRoomId || ev.roomId.toLowerCase() !== currentRoomId.toLowerCase()) return;
        if (ev.userId.toLowerCase() === user.id.toLowerCase()) return;

        setTypingUsers((prev) => {
          const exists = prev.includes(ev.userId);
          if (ev.isTyping) return exists ? prev : [...prev, ev.userId];
          return prev.filter((id) => id !== ev.userId);
        });
      });

      onInitialOnlineUsers(handleInitialOnlineUsers);
      onUserOnline(handleUserOnline);
      onUserOffline(handleUserOffline);

      const roomsRes = await api.get<RoomForUserDto[]>(`/api/rooms/for-user/${user.id}`);
      const mappedRooms: ChatRoom[] = roomsRes.data.map((r) => ({
        id: r.id,
        name: r.name,
        isPrivate: r.isPrivate,
        otherUserId: r.otherUserId ?? undefined,
        otherDisplayName: r.otherDisplayName ?? undefined,
      }));

      setRooms(mappedRooms);

      if (mappedRooms.length > 0) {
        const first = mappedRooms[0];
        await handleRoomJoin(first.id, user); // Helper function usage
      }
    } catch (err) {
      console.error("SignalR init error:", err);
    } finally {
      setIsInitializing(false);
    }
  };

  // Helper for room joining to avoid duplication
  const handleRoomJoin = async (roomId: string, user: CurrentUser) => {
    setSelectedRoomId(roomId);
    selectedRoomRef.current = roomId;
    await joinRoom(roomId);
    const history = await fetchMessagesForRoom(roomId);
    setMessages(
      history.map((m) => ({
        ...m,
        isOwn: m.senderId.toLowerCase() === user.id.toLowerCase(),
      }))
    );
  };

  // --- Effects ---
  useEffect(() => {
    if (currentUser) {
      initForUser(currentUser);
    } else {
       // Cleanup on logout/unmount
       stopConnection();
    }
    return () => {
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]); 
  // Megjegyzés: A currentUser referencia változását figyeljük. 
  // Ha a user objektum nem változik, nem fut le újra.

  // --- Actions ---

  const switchRoom = async (roomId: string) => {
    if (!currentUser || roomId === selectedRoomId) return;
    
    // Leave prev room
    if (selectedRoomId) {
       try { await leaveRoom(selectedRoomId); } catch (e) { console.warn(e); }
    }
    
    setMessages([]);
    setTypingUsers([]);
    await handleRoomJoin(roomId, currentUser);
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || !currentUser || !selectedRoomId) return;
    try {
      await sendMessageToRoom(selectedRoomId, currentUser.id, content.trim());
    } catch (err) {
      console.error("SendMessage error:", err);
    }
  };

  const sendTypingSignal = async (isTyping: boolean) => {
     if (!currentUser || !selectedRoomId) return;
     try {
        await sendTyping(selectedRoomId, currentUser.id, isTyping);
     } catch(err) { console.warn(err); }
  };

  const handleInputTyping = (value: string) => {
    if (!currentUser || !selectedRoomId) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      sendTypingSignal(true);
    }

    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = window.setTimeout(() => {
      isTypingRef.current = false;
      sendTypingSignal(false);
    }, 2000);
  };

  const openUserList = async () => {
    if (!currentUser) return;
    setUserListError(null);
    try {
      const users = await getAllUsers();
      const filtered = users.filter((u) => u.id !== currentUser.id);
      const mapped: UserWithPresence[] = filtered.map((u) => ({
         ...u, 
         isOnline: onlineUserIds.some(id => id.toLowerCase() === u.id.toLowerCase()) 
      }));
      setAllUsers(mapped);
      setIsUserListOpen(true);
    } catch (err) {
      setUserListError("Nem sikerült betölteni a felhasználókat.");
      setIsUserListOpen(true);
    }
  };

  const startDm = async (target: UserWithPresence) => {
    if (!currentUser) return;
    try {
      const res = await api.post<RoomForUserDto>("/api/rooms/direct", null, {
        params: { userId: currentUser.id, targetUserId: target.id },
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
        return exists ? prev : [...prev, dmRoom];
      });
      setIsUserListOpen(false);
      await switchRoom(dmRoom.id);
    } catch (err) {
      console.error("DM error", err);
      setUserListError("Nem sikerült megnyitni a privát beszélgetést.");
    }
  };

  return {
    rooms,
    selectedRoomId,
    messages,
    typingUsers,
    isInitializing,
    // Actions
    switchRoom,
    sendMessage,
    handleInputTyping,
    // User list logic
    isUserListOpen,
    setIsUserListOpen,
    userListError,
    allUsers,
    openUserList,
    startDm
  };
}