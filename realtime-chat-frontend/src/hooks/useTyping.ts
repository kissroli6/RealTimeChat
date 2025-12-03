import { useCallback, useEffect, useRef, useState } from "react";
import type { CurrentUser } from "../types/user";
import type { TypingEvent } from "../types/message";

export function useTyping(
  currentUser: CurrentUser | null,
  selectedRoomId: string | null
) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<number | null>(null);
  const isTypingRef = useRef(false);
  const selectedRoomRef = useRef<string | null>(selectedRoomId);

  useEffect(() => {
    selectedRoomRef.current = selectedRoomId;
  }, [selectedRoomId]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleRemoteTyping = useCallback(
    (ev: TypingEvent) => {
      const currentRoomId = selectedRoomRef.current;
      if (!currentRoomId) return;

      if (ev.roomId.toLowerCase() !== currentRoomId.toLowerCase()) {
        return;
      }

      if (currentUser && ev.userId.toLowerCase() === currentUser.id.toLowerCase()) {
        return;
      }

      setTypingUsers((prev) => {
        const exists = prev.includes(ev.userId);
        if (ev.isTyping) {
          if (exists) return prev;
          return [...prev, ev.userId];
        }
        return prev.filter((id) => id !== ev.userId);
      });
    },
    [currentUser]
  );

  const handleLocalTyping = useCallback(
    async (
      value: string,
      sendTypingStatus: (roomId: string, userId: string, isTyping: boolean) => Promise<void>
    ) => {
      if (!currentUser || !selectedRoomRef.current) return;

      if (!isTypingRef.current) {
        isTypingRef.current = true;
        try {
          await sendTypingStatus(selectedRoomRef.current, currentUser.id, true);
        } catch (err) {
          console.warn("sendTyping(true) error:", err);
        }
      }

      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = window.setTimeout(async () => {
        if (!currentUser || !selectedRoomRef.current) return;
        isTypingRef.current = false;
        try {
          await sendTypingStatus(selectedRoomRef.current, currentUser.id, false);
        } catch (err) {
          console.warn("sendTyping(false) error:", err);
        }
      }, 2000);

      return value;
    },
    [currentUser]
  );

  const resetTyping = useCallback(() => {
    setTypingUsers([]);
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    isTypingRef.current = false;
  }, []);

  return {
    typingUsers,
    handleRemoteTyping,
    handleLocalTyping,
    resetTyping,
  };
}
