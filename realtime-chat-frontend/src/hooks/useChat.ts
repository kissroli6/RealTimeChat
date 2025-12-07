import { useState, useRef, useEffect } from "react";

import {
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
  onRoomCreated,
  stopConnection,
  type ChatMessageDto,
  type TypingEvent,
  type RoomCreatedDto,
} from "../lib/signalrClient";

import { api } from "../api/client";
import { fetchMessagesForRoom } from "../api/messages";
import { getAllUsers } from "../api/users";

import type { 
  RoomForUserDto, 
  UiMessage, 
  CurrentUser, 
  UserWithPresence,
  UserListMode 
} from "../types";

export type ChatRoom = {
  id: string;
  name: string;
  isPrivate: boolean;
  otherUserId?: string;
  otherDisplayName?: string;
  lastMessage?: string;
  lastMessageSender?: string;
  isOnline?: boolean;
  participantIds?: string[];
};

export type TypingUser = {
  userId: string;
  displayName: string;
};

export function useChat(currentUser: CurrentUser | null) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<UserWithPresence[]>([]);
  
  const [isInitializing, setIsInitializing] = useState(false);
  const [isUserListOpen, setIsUserListOpen] = useState(false);
  const [userListMode, setUserListMode] = useState<UserListMode>('DM');
  const [userListError, setUserListError] = useState<string | null>(null);

  const typingTimeoutRef = useRef<number | null>(null);
  const isTypingRef = useRef(false);
  const selectedRoomRef = useRef<string | null>(selectedRoomId);
  const onlineUsersRef = useRef<string[]>([]);

  useEffect(() => {
    selectedRoomRef.current = selectedRoomId;
  }, [selectedRoomId]);

  const updateRoomsWithPresence = (currentRooms: ChatRoom[], onlineIds: string[]) => {
    return currentRooms.map((room) => {
      if (room.isPrivate && room.otherUserId) {
        const isPartnerOnline = onlineIds.some(
          (id) => id.toLowerCase() === room.otherUserId!.toLowerCase()
        );
        if (room.isOnline !== isPartnerOnline) {
          return { ...room, isOnline: isPartnerOnline };
        }
      }
      return room;
    });
  };

  const handleInitialOnlineUsers = (userIds: string[]) => {
    onlineUsersRef.current = userIds;
    setOnlineUserIds(userIds);
    setAllUsers((prev) =>
      prev.map((u) => ({ ...u, isOnline: userIds.some((id) => id.toLowerCase() === u.id.toLowerCase()) }))
    );
    setRooms((prevRooms) => updateRoomsWithPresence(prevRooms, userIds));
  };

  const handleUserOnline = (userId: string) => {
    const currentIds = onlineUsersRef.current;
    if (!currentIds.some(id => id.toLowerCase() === userId.toLowerCase())) {
        const newIds = [...currentIds, userId];
        onlineUsersRef.current = newIds;
        setOnlineUserIds(newIds);
        setAllUsers((prev) =>
            prev.map((u) => (u.id.toLowerCase() === userId.toLowerCase() ? { ...u, isOnline: true } : u))
        );
        setRooms((prevRooms) => updateRoomsWithPresence(prevRooms, newIds));
    }
  };

  const handleUserOffline = (userId: string) => {
    const currentIds = onlineUsersRef.current;
    const newIds = currentIds.filter(id => id.toLowerCase() !== userId.toLowerCase());
    onlineUsersRef.current = newIds;
    setOnlineUserIds(newIds);
    setAllUsers((prev) =>
      prev.map((u) => (u.id.toLowerCase() === userId.toLowerCase() ? { ...u, isOnline: false } : u))
    );
    setRooms((prevRooms) => updateRoomsWithPresence(prevRooms, newIds));
  };

  const handleRoomCreated = (roomDto: RoomCreatedDto) => {
    setRooms((prev) => {
      if (prev.some((r) => r.id === roomDto.id)) return prev;

      const newRoom: ChatRoom = {
        id: roomDto.id,
        name: roomDto.name,
        isPrivate: roomDto.isPrivate,
        otherUserId: roomDto.otherUserId,
        otherDisplayName: roomDto.otherDisplayName,
        participantIds: roomDto.participantIds,
        isOnline: false,
        lastMessage: undefined,
        lastMessageSender: undefined
      };

      if (newRoom.isPrivate && newRoom.otherUserId) {
         const isPartnerOnline = onlineUsersRef.current.some(
            id => id.toLowerCase() === newRoom.otherUserId!.toLowerCase()
         );
         newRoom.isOnline = isPartnerOnline;
      }

      return [newRoom, ...prev];
    });
  };

  const initForUser = async (user: CurrentUser) => {
    setIsInitializing(true);
    setMessages([]);
    setTypingUsers([]);
    setRooms([]); 
    setSelectedRoomId(null);
    selectedRoomRef.current = null;
    setOnlineUserIds([]);
    onlineUsersRef.current = [];

    try {
      await startConnection();
      await registerUser(user.id);

      onMessageReceived((msg: ChatMessageDto) => {
        const isMe = msg.senderId.toLowerCase() === user.id.toLowerCase();
        if (selectedRoomRef.current === msg.roomId) {
            setMessages((prev) => [...prev, { ...msg, isOwn: isMe }]);
        }
        setRooms((prevRooms) => {
           return prevRooms.map(room => {
             if (room.id === msg.roomId) {
               return {
                 ...room,
                 lastMessage: msg.content,
                 lastMessageSender: isMe ? "Te" : (msg.displayName || "Valaki")
               };
             }
             return room;
           });
        });
      });

      onUserTyping((ev: TypingEvent) => {
        const currentRoomId = selectedRoomRef.current;
        if (!currentRoomId || ev.roomId.toLowerCase() !== currentRoomId.toLowerCase()) return;
        if (ev.userId.toLowerCase() === user.id.toLowerCase()) return;

        setTypingUsers((prev) => {
            if (ev.isTyping) {
                const exists = prev.some(u => u.userId === ev.userId);
                if (exists) return prev;
                return [...prev, { userId: ev.userId, displayName: ev.displayName || "Valaki" }];
            } else {
                return prev.filter((u) => u.userId !== ev.userId);
            }
        });
      });

      onInitialOnlineUsers(handleInitialOnlineUsers);
      onUserOnline(handleUserOnline);
      onUserOffline(handleUserOffline);
      onRoomCreated(handleRoomCreated);

      const roomsRes = await api.get<RoomForUserDto[]>(`/api/rooms/for-user/${user.id}`);
      const usersRes = await getAllUsers();
      setAllUsers(usersRes);

      let mappedRooms: ChatRoom[] = roomsRes.data.map((r) => ({
        id: r.id,
        name: r.name,
        isPrivate: r.isPrivate,
        otherUserId: r.otherUserId ?? undefined,
        otherDisplayName: r.otherDisplayName ?? undefined,
        lastMessage: undefined,
        lastMessageSender: undefined,
        isOnline: false,
        participantIds: (r as any).ParticipantIds ?? r.participantIds ?? []
      }));

      const roomsWithMessages = await Promise.all(
        mappedRooms.map(async (room) => {
            try {
                const history = await fetchMessagesForRoom(room.id);
                if (history && history.length > 0) {
                    const lastMsg = history[history.length - 1];
                    const isMe = lastMsg.senderId.toLowerCase() === user.id.toLowerCase();
                    return {
                        ...room,
                        lastMessage: lastMsg.content,
                        lastMessageSender: isMe ? "Te" : (lastMsg.displayName || "Valaki")
                    };
                }
            } catch (e) {
                console.warn("Message fetch failed for room", room.id);
            }
            return room;
        })
      );

      const finalRooms = updateRoomsWithPresence(roomsWithMessages, onlineUsersRef.current);
      setRooms(finalRooms);

    } catch (err) {
      console.error("SignalR init error:", err);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleRoomJoin = async (roomId: string, user: CurrentUser) => {
    setSelectedRoomId(roomId);
    selectedRoomRef.current = roomId;
    setMessages([]); 
    await joinRoom(roomId);
    const history = await fetchMessagesForRoom(roomId);
    setMessages(
      history.map((m) => ({
        ...m,
        isOwn: m.senderId.toLowerCase() === user.id.toLowerCase(),
      }))
    );
  };

  useEffect(() => {
    let isUnmounted = false;

    const bootstrap = async () => {
      await stopConnection();
      if (currentUser && !isUnmounted) {
        await initForUser(currentUser);
      }
    };

    bootstrap();

    return () => {
      isUnmounted = true;
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
      void stopConnection();
    };
  }, [currentUser]);


  const switchRoom = async (roomId: string) => {
    if (!currentUser || roomId === selectedRoomId) return;
    if (selectedRoomId) {
       try { await leaveRoom(selectedRoomId); } catch (e) { console.warn(e); }
    }
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

  const handleInputTyping = (_: string) => {
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

  const sendTypingSignal = async (isTyping: boolean) => {
     if (!currentUser || !selectedRoomId) return;
     try {
        await sendTyping(selectedRoomId, currentUser.id, isTyping);
     } catch(err) { console.warn(err); }
  };

  const openUserList = async (mode: UserListMode) => {
    if (!currentUser) return;
    setUserListError(null);
    setUserListMode(mode); 
    if (allUsers.length === 0) {
        try {
          const users = await getAllUsers();
          setAllUsers(users);
        } catch (err) {
          setUserListError("Nem sikerült betölteni a felhasználókat.");
        }
    }
    setIsUserListOpen(true);
  };

  const startDm = async (target: UserWithPresence) => {
    if (!currentUser) return;
    try {
      const res = await api.post<RoomForUserDto>("/api/rooms/direct", null, {
        params: { userId: currentUser.id, targetUserId: target.id },
      });
      const r = res.data;
      const isTargetOnline = onlineUserIds.some(
          id => id.toLowerCase() === (r.otherUserId ?? target.id).toLowerCase()
      );
      const dmRoom: ChatRoom = {
        id: r.id,
        name: r.name,
        isPrivate: r.isPrivate,
        otherUserId: r.otherUserId ?? target.id,
        otherDisplayName: r.otherDisplayName ?? target.displayName,
        isOnline: isTargetOnline,
        participantIds: []
      };
      setRooms((prev) => {
        const exists = prev.find((x) => x.id === dmRoom.id);
        if (exists) return prev;
        return [...prev, dmRoom];
      });
      setIsUserListOpen(false);
      await switchRoom(dmRoom.id);
    } catch (err) {
      console.error("DM error", err);
      setUserListError("Nem sikerült megnyitni a privát beszélgetést.");
    }
  };

  const createGroup = async (name: string, userIds: string[]) => {
    if (!currentUser) return;
    const isPrivateGroup = userListMode === 'GROUP'; 
    try {
        const res = await api.post<RoomForUserDto>("/api/rooms/group", {
            name: name,
            userIds: [currentUser.id, ...userIds],
            isPrivate: isPrivateGroup
        });
        const r = res.data;
        const groupRoom: ChatRoom = {
            id: r.id,
            name: r.name,
            isPrivate: r.isPrivate,
            lastMessage: "A csoport létrejött",
            lastMessageSender: "Rendszer",
            isOnline: false,
            participantIds: (r as any).ParticipantIds ?? r.participantIds ?? []
        };
        setRooms((prev) => [groupRoom, ...prev]);
        setIsUserListOpen(false);
        await switchRoom(groupRoom.id);
    } catch (err) {
        console.error("Create group error", err);
        setUserListError("Nem sikerült létrehozni a csoportot.");
    }
  };

  const addMemberToGroup = async (roomId: string, userId: string) => {
    if (!currentUser) return;
    try {
        await api.post("/api/rooms/add-member", { roomId, userId });
        setRooms(prev => prev.map(r => {
            if (r.id === roomId) {
                return { ...r, participantIds: [...(r.participantIds || []), userId] };
            }
            return r;
        }));
    } catch (err) {
        console.error("Add member failed", err);
    }
  };

  const removeMemberFromGroup = async (roomId: string, userId: string) => {
    if (!currentUser) return;
    try {
        await api.post("/api/rooms/remove-member", { roomId, userId });
        setRooms(prev => prev.map(r => {
            if (r.id === roomId) {
                return { ...r, participantIds: (r.participantIds || []).filter(id => id !== userId) };
            }
            return r;
        }));
    } catch (err) {
        console.error("Remove member failed", err);
    }
  };

  return {
    rooms,
    selectedRoomId,
    messages,
    typingUsers,
    isInitializing,
    switchRoom,
    sendMessage,
    handleInputTyping,
    isUserListOpen,
    setIsUserListOpen,
    userListError,
    allUsers,
    openUserList,
    userListMode,
    startDm,
    createGroup,
    addMemberToGroup,
    removeMemberFromGroup
  };
}