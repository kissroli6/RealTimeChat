import { useState } from "react";

interface LoginScreenProps {
  onLogin: (userName: string) => void;
  isLoading: boolean;
  error: string | null;
}

export function LoginScreen({ onLogin, isLoading, error }: LoginScreenProps) {
  const [userName, setUserName] = useState("");

  const handleSubmit = () => {
    if (userName.trim()) onLogin(userName);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#111", color: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ backgroundColor: "#181818", padding: "24px 28px", borderRadius: "16px", width: "100%", maxWidth: "420px", boxShadow: "0 10px 30px rgba(0,0,0,0.6)" }}>
        <h1 style={{ fontSize: "24px", marginBottom: "8px" }}>Real-Time Chat</h1>
        <p style={{ color: "#aaa", marginBottom: "16px" }}>Add meg a felhasználónevedet a belépéshez.</p>

        <label style={{ display: "block", fontSize: "14px", marginBottom: "6px" }}>Felhasználónév</label>
        <input
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          style={{ width: "100%", padding: "8px 10px", borderRadius: "999px", border: "1px solid #333", backgroundColor: "#111", color: "#f5f5f5", marginBottom: "10px" }}
          placeholder="pl. boldi"
        />

        {error && <p style={{ color: "#ff6b6b", fontSize: "13px", marginBottom: "10px" }}>{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={isLoading}
          style={{ width: "100%", padding: "8px 16px", borderRadius: "999px", border: "none", backgroundColor: "#9FD633", color: "#111", cursor: "pointer", fontWeight: 600, opacity: isLoading ? 0.7 : 1 }}
        >
          {isLoading ? "Belépés..." : "Belépés"}
        </button>
      </div>
    </div>
  );
}