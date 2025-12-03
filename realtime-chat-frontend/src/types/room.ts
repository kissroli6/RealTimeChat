export interface RoomForUserDto {
  id: string;
  name: string;
  isPrivate: boolean;
  otherUserId?: string | null;
  otherDisplayName?: string | null;
}

export interface ChatRoom {
  id: string;
  name: string;
  isPrivate: boolean;
  otherUserId?: string;
  otherDisplayName?: string;
}
