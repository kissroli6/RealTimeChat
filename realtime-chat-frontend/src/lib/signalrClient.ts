// src/lib/signalrClient.ts
import {
  HubConnection,
  HubConnectionBuilder,
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
  isTyping: boolean;
};

let connection: HubConnection | null = null;
let startPromise: Promise<void> | null = null;

const HUB_URL = "https://localhost:7274/hubs/chat";

// --- helper: aktuális connection, de NEM dob hibát ---

function ensureConnectedOrWarn(op: string): HubConnection | null {
  if (!connection) {
    console.warn(`[SignalR] ${op} called but connection is null.`);
    return null;
  }

  if (connection.state !== "Connected") {
    console.warn(
      `[SignalR] ${op} called but connection state is '${connection.state}'.`
    );
    return null;
  }

  return connection;
}

// --- PUBLIC API ---

export async function startConnection(): Promise<void> {
  // már kész
  if (connection && connection.state === "Connected") {
    return;
  }

  // már folyamatban lévő start – csak várjuk meg
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
    (payload: { roomId: string; userId: string; isTyping: boolean }) => {
      if (typingHandler) {
        typingHandler({
          roomId: payload.roomId,
          userId: payload.userId,
          isTyping: payload.isTyping,
        });
      }
    }
  );

  // csak a warningok miatt: üres handlerek presence-hez
  connection.on("UserOnline", (userId: string) => {
    console.debug("[SignalR] UserOnline:", userId);
  });
  connection.on("useronline", (userId: string) => {
    console.debug("[SignalR] useronline:", userId);
  });

  connection.on(
    "UserJoinedRoom",
    (roomId: string, userId: string | null) => {
      console.debug("[SignalR] UserJoinedRoom:", roomId, userId);
    }
  );
  connection.on(
    "userjoinedroom",
    (roomId: string, userId: string | null) => {
      console.debug("[SignalR] userjoinedroom:", roomId, userId);
    }
  );

  startPromise = connection
    .start()
    .then(() => {
      console.log("[SignalR] Connected to hub:", HUB_URL);
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

// --- event handlerek regisztrálása a React app felől ---

let messageHandler: ((msg: ChatMessageDto) => void) | null = null;
let typingHandler: ((ev: TypingEvent) => void) | null = null;

export function onMessageReceived(
  handler: (msg: ChatMessageDto) => void
): void {
  messageHandler = handler;
}

export function onUserTyping(
  handler: (ev: TypingEvent) => void
): void {
  typingHandler = handler;
}
