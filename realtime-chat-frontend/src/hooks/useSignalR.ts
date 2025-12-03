import { useCallback, useEffect, useRef, useState } from "react";
import {
  joinRoom as joinRoomHub,
  leaveRoom as leaveRoomHub,
  onInitialOnlineUsers,
  onMessageReceived,
  onUserOffline,
  onUserOnline,
  onUserTyping,
  registerUser,
  sendMessageToRoom,
  sendTyping,
  startConnection,
  stopConnection,
} from "../lib/signalrClient";
import type { ChatMessageDto, TypingEvent } from "../types/message";

interface UseSignalROptions {
  onMessageReceived: (msg: ChatMessageDto) => void;
  onUserTyping: (ev: TypingEvent) => void;
  onInitialOnlineUsers: (userIds: string[]) => void;
  onUserOnline: (userId: string) => void;
  onUserOffline: (userId: string) => void;
}

export function useSignalR({
  onMessageReceived: handleMessage,
  onUserTyping: handleTyping,
  onInitialOnlineUsers: handleInitialOnline,
  onUserOnline: handleUserOnline,
  onUserOffline: handleUserOffline,
}: UseSignalROptions) {
  const [isConnecting, setIsConnecting] = useState(false);
  const isConnectedRef = useRef(false);

  const connect = useCallback(
    async (userId: string) => {
      if (isConnectedRef.current) return;
      setIsConnecting(true);
      try {
        await startConnection();
        await registerUser(userId);

        onMessageReceived(handleMessage);
        onUserTyping(handleTyping);
        onInitialOnlineUsers(handleInitialOnline);
        onUserOnline(handleUserOnline);
        onUserOffline(handleUserOffline);

        isConnectedRef.current = true;
      } finally {
        setIsConnecting(false);
      }
    },
    [handleInitialOnline, handleMessage, handleTyping, handleUserOffline, handleUserOnline]
  );

  const disconnect = useCallback(async () => {
    isConnectedRef.current = false;
    onMessageReceived(() => {});
    onUserTyping(() => {});
    onInitialOnlineUsers(() => {});
    onUserOnline(() => {});
    onUserOffline(() => {});
    await stopConnection();
  }, []);

  useEffect(() => {
    return () => {
      void disconnect();
    };
  }, [disconnect]);

  const joinRoom = useCallback(async (roomId: string) => {
    await joinRoomHub(roomId);
  }, []);

  const leaveRoom = useCallback(async (roomId: string) => {
    await leaveRoomHub(roomId);
  }, []);

  const sendRoomMessage = useCallback(
    async (roomId: string, userId: string, content: string) => {
      await sendMessageToRoom(roomId, userId, content);
    },
    []
  );

  const sendTypingStatus = useCallback(
    async (roomId: string, userId: string, isTyping: boolean) => {
      await sendTyping(roomId, userId, isTyping);
    },
    []
  );

  return {
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    sendRoomMessage,
    sendTypingStatus,
    isConnecting,
  };
}
