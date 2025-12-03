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
  onInitialOnlineUsers,
  onUserOnline,
  onUserOffline,
  type ChatMessageDto,
  type TypingEvent,
} from "./lib/signalrClient";
import { fetchMessagesForRoom } from "./api/messages";
import {
  getUserByUserName,
  getAllUsers,
  type UserDto,
} from "./api/users";
import { api } from "./api/client";

// Backend DTO a /api/rooms/for-user és /api/rooms/direct válaszhoz
type RoomForUserDto = {
  id: string;
  name: string;
  isPrivate: boolean;
  otherUserId?: string | null;
  otherDisplayName?: string | null;
};

// UI-ban használt room típus
type ChatRoom = {
  id: string;
  name: string;
  isPrivate: boolean;
  otherUserId?: string;
  otherDisplayName?: string;
};

// UI-ban használt message típus
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

// User lista eleme, opcionális online státusszal
type UserWithPresence = UserDto & {
  isOnline?: boolean;
};

const LOCAL_STORAGE_USER_KEY = "rtc_current_user";

function App() {
  // Dinamikus rooms lista (public + DM)
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(
    null
  );

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(
    null
  );

  // Typing indicator: akik éppen gépelnek az aktuális szobában (rajtad kívül)
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<number | null>(null);
  const isTypingRef = useRef(false);

  const selectedRoomRef = useRef<string | null>(selectedRoomId);
  useEffect(() => {
    selectedRoomRef.current = selectedRoomId;
  }, [selectedRoomId]);

  // Login form state
  const [loginUserName, setLoginUserName] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // User lista DM-hez (online/offline státusszal)
  const [allUsers, setAllUsers] = useState<UserWithPresence[]>([]);
  // Online userek ID listája (Guid stringek)
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  const [isUserListOpen, setIsUserListOpen] = useState(false);
  const [userListError, setUserListError] = useState<string | null>(
    null
  );

  // ======= PRESENCE HANDLEREK (előbb definiáljuk, hogy initForUser használhassa) =======

  const handleInitialOnlineUsers = (userIds: string[]) => {
    setOnlineUserIds(userIds);

    // ha már be van töltve a felhasználó lista, frissítjük is
    setAllUsers((prev) =>
      prev.map((u) => {
        const isOnline = userIds.some(
          (id) => id.toLowerCase() === u.id.toLowerCase()
        );
        return { ...u, isOnline };
      })
    );
  };

  const handleUserOnline = (userId: string) => {
    setOnlineUserIds((prev) => {
      if (prev.some((id) => id.toLowerCase() === userId.toLowerCase())) {
        return prev;
      }
      return [...prev, userId];
    });

    setAllUsers((prev) =>
      prev.map((u) =>
        u.id.toLowerCase() === userId.toLowerCase()
          ? { ...u, isOnline: true }
          : u
      )
    );
  };

  const handleUserOffline = (userId: string) => {
    setOnlineUserIds((prev) =>
      prev.filter((id) => id.toLowerCase() !== userId.toLowerCase())
    );

    setAllUsers((prev) =>
      prev.map((u) =>
        u.id.toLowerCase() === userId.toLowerCase()
          ? { ...u, isOnline: false }
          : u
      )
    );
  };

  // --- SignalR + history + rooms init egy konkrét userrel ---

  async function initForUser(user: CurrentUser): Promise<void> {
    setIsInitializing(true);
    setMessages([]);
    setTypingUsers([]);
    setRooms([]);
    setSelectedRoomId(null);
    selectedRoomRef.current = null;
    setOnlineUserIds([]); // presence reset

    try {
      console.log("Starting SignalR connection...");
      await startConnection();
      console.log("SignalR connected.");

      await registerUser(user.id);

      // Új üzenetek fogadása
      onMessageReceived((msg: ChatMessageDto) => {
        setMessages((prev) => [
          ...prev,
          {
            ...msg,
            isOwn:
              msg.senderId.toLowerCase() === user.id.toLowerCase(),
          },
        ]);
      });

      // Typing események figyelése
      onUserTyping((ev: TypingEvent) => {
        const currentRoomId = selectedRoomRef.current;
        if (!currentRoomId) return;

        // csak az aktuális szoba érdekel
        if (ev.roomId.toLowerCase() !== currentRoomId.toLowerCase()) {
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

      // 🔑 PRESENCE EVENTEKRE ITT IRATKOZUNK FEL, NEM A CALLBACKBEN
      onInitialOnlineUsers(handleInitialOnlineUsers);
      onUserOnline(handleUserOnline);
      onUserOffline(handleUserOffline);

      // Szobák betöltése az adott usernek (public + DM)
      const roomsRes = await api.get<RoomForUserDto[]>(
        `/api/rooms/for-user/${user.id}`
      );

      const mappedRooms: ChatRoom[] = roomsRes.data.map((r) => ({
        id: r.id,
        name: r.name,
        isPrivate: r.isPrivate,
        otherUserId: r.otherUserId ?? undefined,
        otherDisplayName: r.otherDisplayName ?? undefined,
      }));

      setRooms(mappedRooms);

      // Ha van legalább egy szoba, lépjünk be az elsőbe + töltsük a historyt
      if (mappedRooms.length > 0) {
        const first = mappedRooms[0];
        setSelectedRoomId(first.id);
        selectedRoomRef.current = first.id;

        await joinRoom(first.id);
        const history = await fetchMessagesForRoom(first.id);
        setMessages(
          history.map((m) => ({
            ...m,
            isOwn:
              m.senderId.toLowerCase() === user.id.toLowerCase(),
          }))
        );
      }
    } catch (err) {
      console.error("SignalR init error:", err);
      setLoginError("Nem sikerült csatlakozni a chat szerverhez.");
    } finally {
      setIsInitializing(false);
    }
  }

  // --- App indulás: megnézzük van-e mentett user ---

  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CurrentUser;
        if (parsed.id && parsed.userName) {
          setCurrentUser(parsed);
          void initForUser(parsed);
        }
      } catch {
        localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
      }
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
      const dto = await getUserByUserName(trimmed);

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
        setLoginError("Váratlan hiba történt bejelentkezés közben.");
      }
    } finally {
      setIsInitializing(false);
    }
  };

  // --- Logout ---

  const handleLogout = async () => {
    await stopConnection();
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);

    setCurrentUser(null);
    setMessages([]);
    setTypingUsers([]);
    setMessageInput("");
    setRooms([]);
    setSelectedRoomId(null);
    selectedRoomRef.current = null;
    setOnlineUserIds([]);
    setAllUsers([]);
  };

  // --- Szoba váltás ---

  const handleRoomClick = async (roomId: string) => {
    if (!currentUser) return;
    if (roomId === selectedRoomId) return;

    const previousRoomId = selectedRoomId;
    setSelectedRoomId(roomId);
    selectedRoomRef.current = roomId;
    setMessages([]);
    setTypingUsers([]);

    // előző szobából kilépés
    if (previousRoomId) {
      try {
        await leaveRoom(previousRoomId);
      } catch (err) {
        console.warn("LeaveRoom error (ignored):", err);
      }
    }

    // új szobához csatlakozás + history betöltés
    await joinRoom(roomId);
    const history = await fetchMessagesForRoom(roomId);
    setMessages(
      history.map((m) => ({
        ...m,
        isOwn:
          m.senderId.toLowerCase() ===
          currentUser.id.toLowerCase(),
      }))
    );
  };

  // --- Typing jelzés küldése ---

  const handleInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setMessageInput(value);

    if (!currentUser || !selectedRoomId) return;

    // első gépeléskor küldünk "isTyping: true"-t
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      try {
        await sendTyping(selectedRoomId, currentUser.id, true);
      } catch (err) {
        console.warn("sendTyping(true) error:", err);
      }
    }

    // debounced leállítás: ha 2s-ig nincs új input, küldünk false-t
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(async () => {
      if (!currentUser || !selectedRoomId) return;
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
    if (!messageInput.trim() || !currentUser || !selectedRoomId) {
      return;
    }

    const content = messageInput.trim();
    setMessageInput("");

    try {
      await sendMessageToRoom(selectedRoomId, currentUser.id, content);
    } catch (err) {
      console.error("SendMessageToRoom error:", err);
    }
  };

  // --- User lista megnyitása DM-hez ---

  const openUserList = async () => {
    if (!currentUser) return;
    setUserListError(null);

    try {
      const users = await getAllUsers();
      const filtered = users.filter((u) => u.id !== currentUser.id);

      const mapped: UserWithPresence[] = filtered.map((u) => {
        const isOnline = onlineUserIds.some(
          (id) => id.toLowerCase() === u.id.toLowerCase()
        );
        return { ...u, isOnline };
      });

      setAllUsers(mapped);
      setIsUserListOpen(true);
    } catch (err) {
      console.error("getAllUsers error:", err);
      setUserListError("Nem sikerült betölteni a felhasználókat.");
      setIsUserListOpen(true);
    }
  };

  // DM szoba létrehozása / megnyitása
  const handleOpenDmWith = async (target: UserWithPresence) => {
    if (!currentUser) return;

    try {
      const res = await api.post<RoomForUserDto>("/api/rooms/direct", null, {
        params: {
          userId: currentUser.id,
          targetUserId: target.id,
        },
      });

      const r = res.data;

      const dmRoom: ChatRoom = {
        id: r.id,
        name: r.name,
        isPrivate: r.isPrivate,
        otherUserId: r.otherUserId ?? target.id,
        otherDisplayName: r.otherDisplayName ?? target.displayName,
      };

      setRooms((prev) => {
        const exists = prev.find((x) => x.id === dmRoom.id);
        if (exists) return prev;
        return [...prev, dmRoom];
      });

      setIsUserListOpen(false);

      // átváltás a DM szobára
      await handleRoomClick(dmRoom.id);
    } catch (err) {
      console.error("DM open error:", err);
      setUserListError(
        "Nem sikerült megnyitni a privát beszélgetést."
      );
    }
  };

  const activeRoom = rooms.find((r) => r.id === selectedRoomId);

  const activeRoomLabel =
    activeRoom && activeRoom.isPrivate && activeRoom.otherDisplayName
      ? `DM: ${activeRoom.otherDisplayName}`
      : activeRoom?.name ?? "Room";

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
      <div style={{ maxWidth: "960px", width: "100%" }}>
        <h1 style={{ fontSize: "32px", marginBottom: "8px" }}>
          Real-Time Chat
        </h1>
        <p style={{ marginBottom: "16px", color: "#aaa" }}>
          SignalR frontend (rooms + DM)
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
        </p>

        <div style={{ display: "flex", gap: "24px" }}>
          {/* Rooms oszlop */}
          <div style={{ minWidth: "200px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <h2
                style={{
                  fontSize: "18px",
                  marginBottom: "0",
                }}
              >
                Rooms
              </h2>
              <button
                onClick={openUserList}
                style={{
                  padding: "4px 8px",
                  borderRadius: "999px",
                  border: "none",
                  backgroundColor: "#333",
                  color: "#f5f5f5",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Felhasználók
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {rooms.map((room) => {
                const label =
                  room.isPrivate && room.otherDisplayName
                    ? `DM: ${room.otherDisplayName}`
                    : room.name;

                return (
                  <button
                    key={room.id}
                    onClick={() => void handleRoomClick(room.id)}
                    style={{
                      marginBottom: "8px",
                      padding: "8px 12px",
                      borderRadius: "999px",
                      border: "none",
                      cursor: "pointer",
                      backgroundColor:
                        room.id === selectedRoomId
                          ? "#f5f5f5"
                          : "#333",
                      color:
                        room.id === selectedRoomId
                          ? "#111"
                          : "#f5f5f5",
                      textAlign: "left",
                    }}
                  >
                    {label}
                  </button>
                );
              })}

              {rooms.length === 0 && (
                <p style={{ fontSize: "13px", color: "#777" }}>
                  Nincsenek elérhető szobák.
                </p>
              )}
            </div>
          </div>

          {/* Chat panel */}
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: "20px", marginBottom: "12px" }}>
              {activeRoomLabel}
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
                  <div key={m.id} style={{ marginBottom: "10px" }}>
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

        {/* User lista DM-hez – egyszerű “modal” */}
        {isUserListOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "360px",
                maxHeight: "480px",
                backgroundColor: "#181818",
                borderRadius: "12px",
                padding: "16px",
                overflowY: "auto",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <h3 style={{ margin: 0 }}>Felhasználók</h3>
                <button
                  onClick={() => setIsUserListOpen(false)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#f5f5f5",
                    cursor: "pointer",
                    fontSize: "18px",
                  }}
                >
                  ✕
                </button>
              </div>

              {userListError && (
                <p
                  style={{
                    color: "#ff6b6b",
                    fontSize: "13px",
                    marginBottom: "8px",
                  }}
                >
                  {userListError}
                </p>
              )}

              {allUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => void handleOpenDmWith(u)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "6px 8px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#222",
                    color: "#f5f5f5",
                    cursor: "pointer",
                    marginBottom: "6px",
                    fontSize: "14px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "2px",
                    }}
                  >
                    <span>{u.displayName}</span>
                    {u.isOnline ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "12px",
                          color: "#9FD633",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            backgroundColor: "#9FD633",
                          }}
                        />
                        Online
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#777",
                        }}
                      >
                        offline
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#999",
                    }}
                  >
                    {u.userName}
                  </div>
                </button>
              ))}

              {allUsers.length === 0 && !userListError && (
                <p style={{ fontSize: "13px", color: "#777" }}>
                  Nincs más felhasználó.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
