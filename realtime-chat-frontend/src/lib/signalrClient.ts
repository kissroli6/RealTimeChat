// src/lib/signalrClient.ts
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";

const HUB_URL = "https://localhost:7274/hubs/chat";

let connection: HubConnection | null = null;

// --- DTO-k ---

export type ChatMessageDto = {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  sentAt: string;
  displayName?: string; // ha a backend küldi a displayName-et, ezt is megkapjuk
};

export type TypingEvent = {
  roomId: string;
  userId: string;
  isTyping: boolean;
};

// --- belső helper: biztosan legyen Connected állapotú connection ---

async function getConnectedConnection(): Promise<HubConnection> {
  if (!connection) {
    connection = new HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
      .build();
  }

  if (
    connection.state === HubConnectionState.Disconnected ||
    connection.state === HubConnectionState.Disconnecting
  ) {
    await connection.start();
  } else if (connection.state === HubConnectionState.Connecting) {
    // megvárjuk, míg átmegy Connected-be
    while (
      connection.state === HubConnectionState.Connecting ||
      connection.state === HubConnectionState.Reconnecting
    ) {
      await new Promise((r) => setTimeout(r, 100));
    }
    if (connection.state !== HubConnectionState.Connected) {
      throw new Error(
        `SignalR connection is not in Connected state. Current state: ${connection.state}`
      );
    }
  }

  return connection;
}

// --- publikus függvények ---

export async function startConnection(): Promise<void> {
  console.log("Starting SignalR connection...");
  const conn = await getConnectedConnection();
  console.log("[SignalR] Connected to hub:", HUB_URL);
}

export async function stopConnection(): Promise<void> {
  if (connection && connection.state !== HubConnectionState.Disconnected) {
    await connection.stop();
  }
}

// user regisztráció (ChatHub.Register)
export async function registerUser(userId: string): Promise<void> {
  const conn = await getConnectedConnection();
  await conn.invoke("Register", userId);
}

// szobába belépés / kilépés
export async function joinRoom(roomId: string): Promise<void> {
  const conn = await getConnectedConnection();
  await conn.invoke("JoinRoom", roomId);
}

export async function leaveRoom(roomId: string): Promise<void> {
  const conn = await getConnectedConnection();
  await conn.invoke("LeaveRoom", roomId);
}

// üzenet küldése szobába
export async function sendMessageToRoom(
  roomId: string,
  senderId: string,
  content: string
): Promise<void> {
  const conn = await getConnectedConnection();
  await conn.invoke("SendMessageToRoom", roomId, senderId, content);
}

// gépelés jelzése
export async function sendTyping(
  roomId: string,
  userId: string,
  isTyping: boolean
): Promise<void> {
  const conn = await getConnectedConnection();
  await conn.invoke("Typing", roomId, userId, isTyping);
}

// --- event handler regisztrációk ---
// FONTOS: .off(...) minden .on(...) előtt → csak 1 handler marad, nincs duplázás

export function onMessageReceived(
  handler: (msg: ChatMessageDto) => void
): void {
  if (!connection) {
    // a startConnection úgyis létrehozza majd, utána hívd meg újra ezt a függvényt
    return;
  }

  connection.off("ReceiveMessage");
  connection.on("ReceiveMessage", (msg: ChatMessageDto) => {
    handler(msg);
  });
}

export function onUserTyping(handler: (ev: TypingEvent) => void): void {
  if (!connection) {
    return;
  }

  connection.off("UserTyping");
  connection.on("UserTyping", (ev: TypingEvent) => {
    handler(ev);
  });
}

// opcionális: ha nem akarod látni a "No client method 'useronline'" warningot,
// ide tehetsz üres handlereket is:

export function registerPresenceHandlers(): void {
  if (!connection) return;

  // csak azért, hogy ne logoljon warningot
  connection.off("UserOnline");
  connection.off("UserOffline");
  connection.off("UserJoinedRoom");
  connection.off("UserLeftRoom");

  connection.on("UserOnline", () => {});
  connection.on("UserOffline", () => {});
  connection.on("UserJoinedRoom", () => {});
  connection.on("UserLeftRoom", () => {});
}
