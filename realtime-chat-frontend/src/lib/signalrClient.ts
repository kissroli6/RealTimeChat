import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";

export type ChatMessageDto = {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  sentAt: string;
  displayName?: string;
};

export type TypingEvent = {
  roomId: string;
  userId: string;
  displayName?: string; 
  isTyping: boolean;
};

export type RoomCreatedDto = {
  id: string;
  name: string;
  isPrivate: boolean;
  otherUserId?: string;
  otherDisplayName?: string;
  participantIds?: string[];
};

const HUB_URL = "https://localhost:7274/hubs/chat";

let connection: HubConnection | null = null;
let startPromise: Promise<void> | null = null;

function ensureConnectedOrWarn(op: string): HubConnection | null {
  if (!connection) {
    console.warn(`[SignalR] ${op} called but connection is null.`);
    return null;
  }

  if (connection.state !== HubConnectionState.Connected) {
    console.warn(
      `[SignalR] ${op} called but connection state is '${connection.state}'.`
    );
    return null;
  }

  return connection;
}

let messageHandler: ((msg: ChatMessageDto) => void) | null = null;
let typingHandler: ((ev: TypingEvent) => void) | null = null;
let initialOnlineHandler: ((userIds: string[]) => void) | null = null;
let userOnlineHandler: ((userId: string) => void) | null = null;
let userOfflineHandler: ((userId: string) => void) | null = null;
let roomCreatedHandler: ((room: RoomCreatedDto) => void) | null = null;

export async function startConnection(): Promise<void> {
  if (connection && connection.state === HubConnectionState.Connected) {
    return;
  }
  if (startPromise) {
    await startPromise;
    return;
  }

  connection = new HubConnectionBuilder()
    .withUrl(HUB_URL)
    .configureLogging(LogLevel.Information)
    .withAutomaticReconnect()
    .build();

  connection.on("ReceiveMessage", (msg: ChatMessageDto) => {
    if (messageHandler) {
      messageHandler(msg);
    }
  });

  connection.on(
    "UserTyping",
    (payload: { roomId: string; userId: string; displayName?: string; isTyping: boolean }) => {
      if (typingHandler) {
        typingHandler({
          roomId: payload.roomId,
          userId: payload.userId,
          displayName: payload.displayName,
          isTyping: payload.isTyping,
        });
      }
    }
  );

  connection.on("InitialOnlineUsers", (userIds: string[]) => {
    initialOnlineHandler?.(userIds);
  });

  connection.on("UserOnline", (userId: string) => {
    userOnlineHandler?.(userId);
  });

  connection.on("UserOffline", (userId: string) => {
    userOfflineHandler?.(userId);
  });

  connection.on("RoomCreated", (room: RoomCreatedDto) => {
    if (roomCreatedHandler) {
      roomCreatedHandler(room);
    }
  });

  startPromise = connection
    .start()
    .catch((err) => {
      console.error("[SignalR] Error while starting connection:", err);
      throw err;
    })
    .finally(() => {
      startPromise = null;
    });

  await startPromise;
}

export async function stopConnection(): Promise<void> {
  if (connection) {
    try {
      await connection.stop();
    } catch (err) {
      console.warn("Error while stopping SignalR connection:", err);
    }
    connection = null;
    startPromise = null;
  }
}

export async function registerUser(userId: string): Promise<void> {
  const conn = ensureConnectedOrWarn("registerUser");
  if (!conn) return;

  await conn.invoke("Register", userId);
}

export async function joinRoom(roomId: string): Promise<void> {
  const conn = ensureConnectedOrWarn("joinRoom");
  if (!conn) return;

  await conn.invoke("JoinRoom", roomId);
}

export async function leaveRoom(roomId: string): Promise<void> {
  const conn = ensureConnectedOrWarn("leaveRoom");
  if (!conn) return;

  await conn.invoke("LeaveRoom", roomId);
}

export async function sendMessageToRoom(
  roomId: string,
  senderId: string,
  content: string
): Promise<void> {
  const conn = ensureConnectedOrWarn("sendMessageToRoom");
  if (!conn) return;

  await conn.invoke("SendMessageToRoom", roomId, senderId, content);
}

export async function sendTyping(
  roomId: string,
  userId: string,
  isTyping: boolean
): Promise<void> {
  const conn = ensureConnectedOrWarn("sendTyping");
  if (!conn) return;

  await conn.invoke("Typing", roomId, userId, isTyping);
}

export function onMessageReceived(
  handler: (msg: ChatMessageDto) => void
): void {
  messageHandler = handler;
}

export function onUserTyping(handler: (ev: TypingEvent) => void): void {
  typingHandler = handler;
}

export function onInitialOnlineUsers(
  handler: (userIds: string[]) => void
): void {
  initialOnlineHandler = handler;
}

export function onUserOnline(handler: (userId: string) => void): void {
  userOnlineHandler = handler;
}

export function onUserOffline(handler: (userId: string) => void): void {
  userOfflineHandler = handler;
}

export function onRoomCreated(handler: (room: RoomCreatedDto) => void): void {
  roomCreatedHandler = handler;
}