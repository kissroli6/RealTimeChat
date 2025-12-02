// src/App.tsx
import { useEffect, useRef, useState } from "react";
import {
  startConnection,
  stopConnection,
  registerUser,
  joinRoom,
  leaveRoom,
  sendMessageToRoom,
  onMessageReceived,
  onUserTyping,
  sendTyping,
  type ChatMessageDto,
  type TypingEvent,
} from "./lib/signalrClient";
import { fetchMessagesForRoom } from "./api/messages";
import {
  getUserByUserName,
  getAllUsers,
  type UserDto,
} from "./api/users";
import {
  getDirectRoomsForUser,
  createDirectRoom,
  type ChatRoomDto,
} from "./api/chatRooms";

// Ezek a room ID-k a DB-ben létező ChatRoom.Id értékek
const GENERAL_ROOM_ID = "cfc347f1-18c9-4b96-a6b9-c8910d3b9c1e";
const DEVS_ROOM_ID = "6fc64c97-d794-493d-bf28-f94534383321";

type ChatRoom = {
  id: string;
  name: string;
  isPrivate: boolean;
};

type UiMessage = {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  sentAt: string;
  isOwn: boolean;
  displayName?: string;
};

type CurrentUser = {
  id: string;
  userName: string;
  displayName: string;
};

const LOCAL_STORAGE_USER_KEY = "rtc_current_user";

function App() {
  // --- Rooms state: publikus + DM szobák is ide kerülnek ---
  const [rooms, setRooms] = useState<ChatRoom[]>([
    { id: GENERAL_ROOM_ID, name: "General", isPrivate: false },
    { id: DEVS_ROOM_ID, name: "Developers", isPrivate: false },
  ]);

  const [selectedRoomId, setSelectedRoomId] =
    useState<string>(GENERAL_ROOM_ID);

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(
    null
  );

  // Typing indicator: akik éppen gépelnek az aktuális szobában (rajtad kívül)
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<number | null>(null);
  const isTypingRef = useRef(false);

  const selectedRoomRef = useRef<string>(selectedRoomId);
  useEffect(() => {
    selectedRoomRef.current = selectedRoomId;
  }, [selectedRoomId]);

  // Login form state
  const [loginUserName, setLoginUserName] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // DM user list (modal) state
  const [allUsers, setAllUsers] = useState<UserDto[]>([]);
  const [isUserListOpen, setIsUserListOpen] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  // --- Segéd: UiMessage építése backend DTO-ból + user listából ---

  function mapDtoToUiMessage(
    dto: ChatMessageDto,
    selfId: string,
    users: UserDto[]
  ): UiMessage {
    const sender = users.find((u) => u.id === dto.senderId);
    return {
      ...dto,
      isOwn: dto.senderId.toLowerCase() === selfId.toLowerCase(),
      displayName: sender?.displayName ?? undefined,
    };
  }

  // --- SignalR + history init egy konkrét userrel ---

  async function initForUser(user: CurrentUser): Promise<void> {
    setIsInitializing(true);
    setMessages([]);
    setTypingUsers([]);

    try {
      console.log("Starting SignalR connection...");
      await startConnection();
      console.log("SignalR connected.");

      await registerUser(user.id);

      // Előre betöltjük az összes usert (DM listához + displayName-ekhez)
      let usersForLookup: UserDto[] = [];
      try {
        const users = await getAllUsers();
        usersForLookup = users;
        setAllUsers(
          users.filter(
            (u) =>
              u.id.toLowerCase() !== user.id.toLowerCase()
          )
        );
      } catch (err) {
        console.error("getAllUsers error:", err);
        usersForLookup = [];
      }

      // Új üzenetek fogadása
      onMessageReceived((msg) => {
        setMessages((prev) => [
          ...prev,
          mapDtoToUiMessage(msg, user.id, usersForLookup),
        ]);
      });

      // Typing események figyelése
      onUserTyping((ev: TypingEvent) => {
        // csak az aktuális szoba érdekel
        if (
          ev.roomId.toLowerCase() !==
          selectedRoomRef.current.toLowerCase()
        ) {
          return;
        }

        // saját typing-et nem mutatjuk
        if (ev.userId.toLowerCase() === user.id.toLowerCase()) {
          return;
        }

        setTypingUsers((prev) => {
          const exists = prev.includes(ev.userId);
          if (ev.isTyping) {
            if (exists) return prev;
            return [...prev, ev.userId];
          } else {
            return prev.filter((id) => id !== ev.userId);
          }
        });
      });

      // belépés a default (General) szobába + history betöltése
      await joinRoom(GENERAL_ROOM_ID);
      const history = await fetchMessagesForRoom(GENERAL_ROOM_ID);

      setMessages(
        history.map((m) =>
          mapDtoToUiMessage(m, user.id, usersForLookup)
        )
      );

      // --- DM szobák betöltése a userhez ---
      try {
        const dmRooms = await getDirectRoomsForUser(user.id);

        setRooms((prev) => {
          const baseRooms = prev.filter((r) => !r.isPrivate);

          const dmUiRooms: ChatRoom[] = dmRooms.map(
            (r: ChatRoomDto) => {
              const otherId =
                r.userAId?.toLowerCase() ===
                user.id.toLowerCase()
                  ? r.userBId
                  : r.userAId;

              const otherUser = usersForLookup.find(
                (u) => u.id === otherId
              );

              return {
                id: r.id,
                name: otherUser?.displayName ?? r.name,
                isPrivate: true,
              };
            }
          );

          const existingIds = new Set(
            baseRooms.map((r) => r.id)
          );
          const merged = [...baseRooms];

          for (const dm of dmUiRooms) {
            if (!existingIds.has(dm.id)) {
              merged.push(dm);
            }
          }

          return merged;
        });
      } catch (err) {
        console.error("getDirectRoomsForUser error:", err);
      }
    } catch (err) {
      console.error("SignalR init error:", err);
      setLoginError(
        "Nem sikerült csatlakozni a chat szerverhez."
      );
    } finally {
      setIsInitializing(false);
    }
  }

  // --- App indulás: megnézzük van-e mentett user ---

  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as CurrentUser;
      if (parsed.id && parsed.userName) {
        setCurrentUser(parsed);
        void initForUser(parsed);
      }
    } catch {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    }

    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Login gomb handler ---

  const handleLogin = async () => {
    setLoginError(null);

    const trimmed = loginUserName.trim();
    if (!trimmed) {
      setLoginError("Add meg a felhasználónevet.");
      return;
    }

    try {
      setIsInitializing(true);
      const dto: UserDto = await getUserByUserName(trimmed);

      const user: CurrentUser = {
        id: dto.id,
        userName: dto.userName,
        displayName: dto.displayName,
      };

      localStorage.setItem(
        LOCAL_STORAGE_USER_KEY,
        JSON.stringify(user)
      );
      setCurrentUser(user);
      await initForUser(user);
    } catch (err: any) {
      console.error("Login error:", err);
      const status = err?.response?.status;

      if (status === 404) {
        setLoginError("Nincs ilyen felhasználó.");
      } else {
        setLoginError(
          "Váratlan hiba történt bejelentkezés közben."
        );
      }
    } finally {
      setIsInitializing(false);
    }
  };

  const handleLogout = async () => {
    await stopConnection();
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    setCurrentUser(null);
    setMessages([]);
    setTypingUsers([]);
    setMessageInput("");
    setRooms([
      { id: GENERAL_ROOM_ID, name: "General", isPrivate: false },
      { id: DEVS_ROOM_ID, name: "Developers", isPrivate: false },
    ]);
    setSelectedRoomId(GENERAL_ROOM_ID);
  };

  // --- DM user list megnyitása ---

  const openUserList = async () => {
    if (!currentUser) return;
    setUsersError(null);
    setIsUserListOpen(true);

    if (allUsers.length === 0) {
      setUsersLoading(true);
      try {
        const users = await getAllUsers();
        setAllUsers(
          users.filter(
            (u) =>
              u.id.toLowerCase() !== currentUser.id.toLowerCase()
          )
        );
      } catch (err) {
        console.error("User list load error:", err);
        setUsersError(
          "Nem sikerült betölteni a felhasználókat."
        );
      } finally {
        setUsersLoading(false);
      }
    }
  };

  const closeUserList = () => {
    setIsUserListOpen(false);
  };

  // --- DM indítása kiválasztott userrel ---

  const startDmWithUser = async (target: UserDto) => {
    if (!currentUser) return;

    try {
      const roomDto = await createDirectRoom(
        currentUser.id,
        target.id
      );

      const dmRoom: ChatRoom = {
        id: roomDto.id,
        name: target.displayName,
        isPrivate: true,
      };

      setRooms((prev) => {
        if (prev.some((r) => r.id === dmRoom.id)) {
          return prev;
        }
        return [...prev, dmRoom];
      });

      // átváltunk a DM szobára
      await handleRoomClick(dmRoom.id);
      setIsUserListOpen(false);
    } catch (err) {
      console.error("startDmWithUser error:", err);
      setUsersError(
        "Nem sikerült elindítani a privát beszélgetést."
      );
    }
  };

  // --- Szoba váltás ---

  const handleRoomClick = async (roomId: string) => {
    if (roomId === selectedRoomId) return;
    if (!currentUser) return;

    const previousRoomId = selectedRoomId;
    setSelectedRoomId(roomId);
    setMessages([]);
    setTypingUsers([]);

    try {
      await leaveRoom(previousRoomId);
    } catch (err) {
      console.warn("LeaveRoom error (ignored):", err);
    }

    await joinRoom(roomId);
    const history = await fetchMessagesForRoom(roomId);

    // a history mappinghez szükségünk van a teljes user listára
    let usersForLookup = allUsers;
    if (usersForLookup.length === 0) {
      try {
        usersForLookup = await getAllUsers();
        setAllUsers(
          usersForLookup.filter(
            (u) =>
              u.id.toLowerCase() !== currentUser.id.toLowerCase()
          )
        );
      } catch (err) {
        console.error("getAllUsers (on room change) error:", err);
        usersForLookup = [];
      }
    }

    setMessages(
      history.map((m) =>
        mapDtoToUiMessage(m, currentUser.id, usersForLookup)
      )
    );
  };

  // --- Typing jelzés küldése ---

  const handleInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setMessageInput(value);

    if (!currentUser) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      try {
        await sendTyping(selectedRoomId, currentUser.id, true);
      } catch (err) {
        console.warn("sendTyping(true) error:", err);
      }
    }

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(async () => {
      if (!currentUser) return;
      isTypingRef.current = false;
      try {
        await sendTyping(selectedRoomId, currentUser.id, false);
      } catch (err) {
        console.warn("sendTyping(false) error:", err);
      }
    }, 2000);
  };

  // --- Üzenet küldése ---

  const handleSend = async () => {
    if (!messageInput.trim() || !currentUser) return;

    const content = messageInput.trim();
    setMessageInput("");

    try {
      await sendMessageToRoom(
        selectedRoomId,
        currentUser.id,
        content
      );
    } catch (err) {
      console.error("SendMessageToRoom error:", err);
    }
  };

  const activeRoom = rooms.find((r) => r.id === selectedRoomId);

  // --- LOGIN KÉPERNYŐ, ha nincs currentUser ---

  if (!currentUser) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#111",
          color: "#f5f5f5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            backgroundColor: "#181818",
            padding: "24px 28px",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "420px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
          }}
        >
          <h1 style={{ fontSize: "24px", marginBottom: "8px" }}>
            Real-Time Chat
          </h1>
          <p style={{ color: "#aaa", marginBottom: "16px" }}>
            Add meg a felhasználónevedet a belépéshez.
          </p>

          <label
            style={{
              display: "block",
              fontSize: "14px",
              marginBottom: "6px",
            }}
          >
            Felhasználónév
          </label>
          <input
            type="text"
            value={loginUserName}
            onChange={(e) => setLoginUserName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleLogin();
              }
            }}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: "999px",
              border: "1px solid #333",
              backgroundColor: "#111",
              color: "#f5f5f5",
              marginBottom: "10px",
            }}
            placeholder="pl. boldi"
          />

          {loginError && (
            <p
              style={{
                color: "#ff6b6b",
                fontSize: "13px",
                marginBottom: "10px",
              }}
            >
              {loginError}
            </p>
          )}

          <button
            onClick={handleLogin}
            disabled={isInitializing}
            style={{
              width: "100%",
              padding: "8px 16px",
              borderRadius: "999px",
              border: "none",
              backgroundColor: "#9FD633",
              color: "#111",
              cursor: "pointer",
              fontWeight: 600,
              opacity: isInitializing ? 0.7 : 1,
            }}
          >
            {isInitializing ? "Belépés..." : "Belépés"}
          </button>
        </div>
      </div>
    );
  }

  // --- FŐ CHAT UI (ha már van currentUser) ---

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#111",
        color: "#f5f5f5",
        display: "flex",
        justifyContent: "center",
        padding: "32px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: "900px", width: "100%" }}>
        <h1 style={{ fontSize: "32px", marginBottom: "8px" }}>
          Real-Time Chat
        </h1>
        <p style={{ marginBottom: "16px", color: "#aaa" }}>
          SignalR frontend
        </p>

        <p style={{ marginBottom: "16px", color: "#aaa" }}>
          Bejelentkezve mint:{" "}
          <strong>{currentUser.displayName}</strong>{" "}
          <span style={{ fontSize: "12px" }}>
            ({currentUser.userName})
          </span>
          <button
            onClick={handleLogout}
            style={{
              marginLeft: "12px",
              padding: "4px 10px",
              borderRadius: "999px",
              border: "none",
              backgroundColor: "#7C58DC",
              color: "#fff",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Kijelentkezés
          </button>
          <button
            onClick={openUserList}
            style={{
              marginLeft: "8px",
              padding: "4px 10px",
              borderRadius: "999px",
              border: "none",
              backgroundColor: "#333",
              color: "#fff",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Felhasználók
          </button>
        </p>

        <div style={{ display: "flex", gap: "24px" }}>
          {/* Rooms */}
          <div style={{ minWidth: "180px" }}>
            <h2 style={{ fontSize: "18px", marginBottom: "8px" }}>
              Rooms
            </h2>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => handleRoomClick(room.id)}
                  style={{
                    marginBottom: "8px",
                    padding: "8px 12px",
                    borderRadius: "999px",
                    border: "none",
                    cursor: "pointer",
                    backgroundColor:
                      room.id === selectedRoomId ? "#f5f5f5" : "#333",
                    color:
                      room.id === selectedRoomId ? "#111" : "#f5f5f5",
                    textAlign: "left",
                  }}
                >
                  {room.isPrivate ? `DM: ${room.name}` : room.name}
                </button>
              ))}
            </div>
          </div>

          {/* Chat panel */}
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: "20px", marginBottom: "12px" }}>
              {activeRoom?.isPrivate
                ? `DM: ${activeRoom.name}`
                : activeRoom?.name ?? "Room"}
            </h2>

            <div
              style={{
                borderRadius: "12px",
                backgroundColor: "#181818",
                padding: "12px",
                minHeight: "260px",
                maxHeight: "460px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  marginBottom: "8px",
                }}
              >
                {messages.map((m) => (
                  <div
                    key={m.id}
                    style={{ marginBottom: "10px" }}
                  >
                    {!m.isOwn && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#888",
                          marginBottom: "2px",
                        }}
                      >
                        {m.displayName || "Ismeretlen felhasználó"}
                      </div>
                    )}

                    <div
                      style={{
                        textAlign: m.isOwn ? "right" : "left",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          padding: "6px 10px",
                          borderRadius: "999px",
                          backgroundColor: m.isOwn
                            ? "#7C58DC"
                            : "#333",
                          color: "#f5f5f5",
                          fontSize: "14px",
                        }}
                      >
                        {m.content}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Typing indicator */}
              {typingUsers.length > 0 && (
                <div
                  style={{
                    fontSize: "12px",
                    color: "#aaa",
                    marginBottom: "8px",
                  }}
                >
                  {typingUsers.length === 1
                    ? "Valaki éppen gépel..."
                    : `${typingUsers.length} ember éppen gépel...`}
                </div>
              )}

              {/* Input sor */}
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  placeholder="Írj üzenetet..."
                  value={messageInput}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    borderRadius: "999px",
                    border: "1px solid #333",
                    backgroundColor: "#111",
                    color: "#f5f5f5",
                  }}
                />
                <button
                  onClick={handleSend}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "999px",
                    border: "none",
                    backgroundColor: "#9FD633",
                    color: "#111",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Küldés
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FELHASZNÁLÓLISTA MODAL */}
      {isUserListOpen && (
        <div
          onClick={closeUserList}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#181818",
              padding: "16px 20px",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "360px",
              maxHeight: "400px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "18px" }}>
                Felhasználók
              </h3>
              <button
                onClick={closeUserList}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#aaa",
                  cursor: "pointer",
                  fontSize: "16px",
                }}
              >
                ✕
              </button>
            </div>

            {usersLoading && (
              <p style={{ fontSize: "13px", color: "#aaa" }}>
                Betöltés...
              </p>
            )}

            {usersError && (
              <p style={{ fontSize: "13px", color: "#ff6b6b" }}>
                {usersError}
              </p>
            )}

            {!usersLoading && !usersError && allUsers.length === 0 && (
              <p style={{ fontSize: "13px", color: "#aaa" }}>
                Nincs más felhasználó.
              </p>
            )}

            <div
              style={{
                marginTop: "8px",
                overflowY: "auto",
              }}
            >
              {allUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => void startDmWithUser(u)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "6px 10px",
                    marginBottom: "4px",
                    borderRadius: "999px",
                    border: "none",
                    backgroundColor: "#333",
                    color: "#f5f5f5",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  {u.displayName}{" "}
                  <span style={{ fontSize: "11px", color: "#aaa" }}>
                    ({u.userName})
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
