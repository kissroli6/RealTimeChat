// src/api/messages.ts

import { api } from "./client";
import type { ChatMessageDto } from "../types/message";

// History egy szobához: GET /api/rooms/{roomId}/messages
export async function fetchMessagesForRoom(
  roomId: string
): Promise<ChatMessageDto[]> {
  const res = await api.get<ChatMessageDto[]>(
    `/api/rooms/${roomId}/messages`
  );
  return res.data;
}
