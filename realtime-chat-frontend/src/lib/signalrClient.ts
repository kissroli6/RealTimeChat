// src/lib/signalrClient.ts

import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import { API_BASE_URL } from "../config";

// A Hub teljes URL-je
const HUB_URL = `${API_BASE_URL}/hubs/chat`;

// --- DTO-k ---

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

// --- Kapcsolat felépítése ---


export async function startConnection(): Promise<void> {
  // Ha már van Connected kapcsolat, nincs teendő
  if (
    connection &&
    connection.state === HubConnectionState.Connected
  ) {
    return;
  }

  // Ha még nincs connection objektum, akkor létrehozzuk
  if (!connection) {
    connection = new HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
      .build();
  }

  // Ha éppen Connecting/Reconnecting állapotban van, ne hívjuk újra a start-ot,
  // csak várjuk meg, míg befejeződik.
  if (
    connection.state === HubConnectionState.Connecting ||
    connection.state === HubConnectionState.Reconnecting
  ) {
    // egyszerűen megvárjuk, míg Connected vagy Disconnected lesz
    while (
      connection.state === HubConnectionState.Connecting ||
      connection.state === HubConnectionState.Reconnecting
    ) {
      await new Promise((r) => setTimeout(r, 50));
    }

    if (connection.state === HubConnectionState.Connected) {
      return;
    }
  }

  // Itt biztosan nem fut a start, ezért most indultatjuk és *MEGVÁRJUK*
  await connection.start();
  console.log("[SignalR] Connected to hub:", HUB_URL);
}

async function getConnectedConnection(): Promise<HubConnection> {
  await startConnection();
  if (!connection || connection.state !== HubConnectionState.Connected) {
    throw new Error("SignalR connection is not in Connected state.");
  }
  return connection;
}

// --- Hub metódusok ---

export async function registerUser(userId: string): Promise<void> {
  const conn = await getConnectedConnection();
  await conn.invoke("Register", userId);
}

export async function joinRoom(roomId: string): Promise<void> {
  const conn = await getConnectedConnection();
  await conn.invoke("JoinRoom", roomId);
}

export async function leaveRoom(roomId: string): Promise<void> {
  const conn = await getConnectedConnection();
  await conn.invoke("LeaveRoom", roomId);
}

export async function sendMessageToRoom(
  roomId: string,
  senderId: string,
  content: string
): Promise<void> {
  const conn = await getConnectedConnection();
  await conn.invoke("SendMessageToRoom", roomId, senderId, content);
}

// Typing jelzés küldése
export async function sendTyping(
  roomId: string,
  userId: string,
  isTyping: boolean
): Promise<void> {
  const conn = await getConnectedConnection();
  await conn.invoke("Typing", roomId, userId, isTyping);
}

// --- Eventek feliratkozása ---

// Új üzenet érkezett egy szobába
export function onMessageReceived(handler: (msg: ChatMessageDto) => void): void {
  if (!connection) {
    return;
  }

  connection.on("ReceiveMessage", (msg: ChatMessageDto) => {
    handler(msg);
  });
}

// Valaki gépel egy szobában
export function onUserTyping(handler: (ev: TypingEvent) => void): void {
  if (!connection) {
    return;
  }

  // Backend: new { RoomId, UserId, IsTyping } → camelCase: roomId, userId, isTyping
  connection.on("UserTyping", (payload: TypingEvent) => {
    handler(payload);
  });
}
export async function stopConnection(): Promise<void> {
  if (connection) {
    try {
      await connection.stop();
      console.log("[SignalR] Connection stopped.");
    } catch (err) {
      console.warn("[SignalR] stopConnection error:", err);
    }
  }
}

export function clearHandlers(connection: HubConnection) {
    connection.off("ReceiveMessage");
    connection.off("UserJoinedRoom");
    connection.off("UserLeftRoom");
    connection.off("UserTyping");
    connection.off("UserOnline");
    connection.off("UserOffline");
}
