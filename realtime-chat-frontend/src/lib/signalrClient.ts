// src/lib/signalrClient.ts
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

const HUB_URL = "https://localhost:7274/hubs/chat";

let connection: HubConnection | null = null;
let startPromise: Promise<void> | null = null;

// ---- helper: biztos Connected state ----

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

// ---- kliens oldali callbackek ----

let messageHandler: ((msg: ChatMessageDto) => void) | null = null;
let typingHandler: ((ev: TypingEvent) => void) | null = null;
let initialOnlineHandler: ((userIds: string[]) => void) | null = null;
let userOnlineHandler: ((userId: string) => void) | null = null;
let userOfflineHandler: ((userId: string) => void) | null = null;

// ---- kapcsolat indítása ----

export async function startConnection(): Promise<void> {
  // már van Connected kapcsolat
  if (connection && connection.state === HubConnectionState.Connected) {
    return;
  }

  // már folyamatban van a start()
  if (startPromise) {
    await startPromise;
    return;
  }

  console.log("Starting SignalR connection...");

  connection = new HubConnectionBuilder()
    .withUrl(HUB_URL)
    .configureLogging(LogLevel.Information)
    .withAutomaticReconnect()
    .build();

  // üzenet fogadás
  connection.on("ReceiveMessage", (msg: ChatMessageDto) => {
    if (messageHandler) {
      messageHandler(msg);
    }
  });

  // typing event
  connection.on(
    "UserTyping",
    (payload: { roomId: string; userId: string; displayName?: string; isTyping: boolean }) => {
      if (typingHandler) {
        typingHandler({
          roomId: payload.roomId,
          userId: payload.userId,
          displayName: payload.displayName, // <--- Átadjuk a nevet is
          isTyping: payload.isTyping,
        });
      }
    }
  );

  // initial online users
  connection.on("InitialOnlineUsers", (userIds: string[]) => {
    console.debug("[SignalR] InitialOnlineUsers:", userIds);
    initialOnlineHandler?.(userIds);
  });

  // user online/offline
  connection.on("UserOnline", (userId: string) => {
    console.debug("[SignalR] UserOnline:", userId);
    userOnlineHandler?.(userId);
  });

  connection.on("UserOffline", (userId: string) => {
    console.debug("[SignalR] UserOffline:", userId);
    userOfflineHandler?.(userId);
  });

  // csak logoljuk a room join/leave-et
  connection.on(
    "UserJoinedRoom",
    (roomId: string, userId: string | null) => {
      console.debug("[SignalR] UserJoinedRoom:", roomId, userId);
    }
  );
  connection.on(
    "UserLeftRoom",
    (roomId: string, userId: string | null) => {
      console.debug("[SignalR] UserLeftRoom:", roomId, userId);
    }
  );

  // start
  startPromise = connection
    .start()
    .then(() => {
      console.log("[SignalR] Connected to hub:", HUB_URL);
    })
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

// ---- Hub metódusok ----

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

// ---- event handlerek regisztrálása a React app felől ----

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
