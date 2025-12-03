export interface ChatMessageDto {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  sentAt: string;
  displayName?: string;
}

export interface UiMessage extends ChatMessageDto {
  isOwn: boolean;
}

export interface TypingEvent {
  roomId: string;
  userId: string;
  isTyping: boolean;
}
