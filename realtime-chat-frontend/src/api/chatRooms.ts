import { api } from "./client";

export type ChatRoomDto = {
  id: string;
  name: string;
  isPrivate: boolean;
  userAId?: string;
  userBId?: string;
  createdAt?: string;
};

export async function getDirectRoomsForUser(
  userId: string
): Promise<ChatRoomDto[]> {
  const res = await api.get<ChatRoomDto[]>(
    `/api/chatrooms/direct/user/${userId}`
  );
  return res.data;
}

export async function createDirectRoom(
  userAId: string,
  userBId: string
): Promise<ChatRoomDto> {
  const res = await api.post<ChatRoomDto>("/api/chatrooms/direct", {
    userAId,
    userBId,
  });
  return res.data;
}
