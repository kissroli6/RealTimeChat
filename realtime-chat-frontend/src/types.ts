import type { UserDto } from "./api/users";

export type RoomForUserDto = {
  id: string;
  name: string;
  isPrivate: boolean;
  otherUserId?: string | null;
  otherDisplayName?: string | null;
  participantIds?: string[];
};

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

export type UserListMode = 'DM' | 'GROUP' | 'PUBLIC';

// MÓDOSÍTÁS: Hozzáadtuk az isPrivate mezőt
export type CreateGroupDto = {
    name: string;
    userIds: string[];
    isPrivate: boolean;
};