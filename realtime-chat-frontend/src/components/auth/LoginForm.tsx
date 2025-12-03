import type { Dispatch, SetStateAction } from "react";

interface LoginFormProps {
  userName: string;
  onUserNameChange: Dispatch<SetStateAction<string>>;
  onLogin: () => void;
  error: string | null;
  isLoading: boolean;
}

export function LoginForm({
  userName,
  onUserNameChange,
  onLogin,
  error,
  isLoading,
}: LoginFormProps) {
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
        <h1 style={{ fontSize: "24px", marginBottom: "8px" }}>Real-Time Chat</h1>
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
          value={userName}
          onChange={(e) => onUserNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onLogin();
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

        {error && (
          <p
            style={{
              color: "#ff6b6b",
              fontSize: "13px",
              marginBottom: "10px",
            }}
          >
            {error}
          </p>
        )}

        <button
          onClick={onLogin}
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "8px 16px",
            borderRadius: "999px",
            border: "none",
            backgroundColor: "#9FD633",
            color: "#111",
            cursor: "pointer",
            fontWeight: 600,
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading ? "Belépés..." : "Belépés"}
        </button>
      </div>
    </div>
  );
}
