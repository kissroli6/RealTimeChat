import type { UserDto } from "./api/users";

export type RoomForUserDto = {
  id: string;
  name: string;
  isPrivate: boolean;
  otherUserId?: string | null;
  otherDisplayName?: string | null;
};

export type ChatRoom = {
  id: string;
  name: string;
  isPrivate: boolean;
  otherUserId?: string;
  otherDisplayName?: string;
};

export type UiMessage = {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  sentAt: string;
  isOwn: boolean;
  displayName?: string;
};

export type CurrentUser = {
  id: string;
  userName: string;
  displayName: string;
};

export type UserWithPresence = UserDto & {
  isOnline?: boolean;
};