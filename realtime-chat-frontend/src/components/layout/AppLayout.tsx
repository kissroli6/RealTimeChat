import type { ReactNode } from "react";
import type { CurrentUser } from "../../types/user";

interface AppLayoutProps {
  currentUser: CurrentUser;
  onLogout: () => void;
  children: ReactNode;
}

export function AppLayout({ currentUser, onLogout, children }: AppLayoutProps) {
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
        <h1 style={{ fontSize: "32px", marginBottom: "8px" }}>Real-Time Chat</h1>
        <p style={{ marginBottom: "16px", color: "#aaa" }}>
          SignalR frontend (rooms + DM)
        </p>

        <p style={{ marginBottom: "16px", color: "#aaa" }}>
          Bejelentkezve mint: <strong>{currentUser.displayName}</strong>{" "}
          <span style={{ fontSize: "12px" }}>({currentUser.userName})</span>
          <button
            onClick={onLogout}
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

        {children}
      </div>
    </div>
  );
}
