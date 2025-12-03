import { useCallback, useState } from "react";
import type { UserDto, UserWithPresence } from "../types/user";

export function usePresence() {
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  const handleInitialOnlineUsers = useCallback((userIds: string[]) => {
    setOnlineUserIds(userIds);
  }, []);

  const handleUserOnline = useCallback((userId: string) => {
    setOnlineUserIds((prev) => {
      if (prev.some((id) => id.toLowerCase() === userId.toLowerCase())) {
        return prev;
      }
      return [...prev, userId];
    });
  }, []);

  const handleUserOffline = useCallback((userId: string) => {
    setOnlineUserIds((prev) =>
      prev.filter((id) => id.toLowerCase() !== userId.toLowerCase())
    );
  }, []);

  const resetPresence = useCallback(() => {
    setOnlineUserIds([]);
  }, []);

  const mapUsersWithPresence = useCallback(
    (users: UserDto[]): UserWithPresence[] =>
      users.map((user) => {
        const isOnline = onlineUserIds.some(
          (id) => id.toLowerCase() === user.id.toLowerCase()
        );
        return { ...user, isOnline };
      }),
    [onlineUserIds]
  );

  return {
    onlineUserIds,
    handleInitialOnlineUsers,
    handleUserOnline,
    handleUserOffline,
    resetPresence,
    mapUsersWithPresence,
  };
}
