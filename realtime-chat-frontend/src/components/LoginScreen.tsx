import { useState } from "react";

interface LoginScreenProps {
  onLogin: (userName: string) => void;
  onRegister: (userName: string, displayName: string) => void;
  isLoading: boolean;
  error: string | null;
}

function AppLogo() {
  return (
    <div className="app-logo">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
      </svg>
    </div>
  );
}

export function LoginScreen({ onLogin, onRegister, isLoading, error }: LoginScreenProps) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [userName, setUserName] = useState("");
  const [displayName, setDisplayName] = useState("");

  const handleSubmit = () => {
    if (!userName.trim()) return;
    if (isRegisterMode) {
        if (!displayName.trim()) return;
        onRegister(userName, displayName);
    } else {
        onLogin(userName);
    }
  };

  const toggleMode = () => {
      setIsRegisterMode(!isRegisterMode);
      setUserName("");
      setDisplayName("");
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <AppLogo />
        <h1 className="login-title">
          {isRegisterMode ? "Fiók létrehozása" : "Üdv újra!"}
        </h1>
        <p className="login-subtitle">
          {isRegisterMode 
            ? "Add meg az adataidat a csatlakozáshoz." 
            : "Add meg a felhasználóneved a belépéshez."}
        </p>

        <div className="login-form">
            <div className="form-group">
              <label className="form-label">FELHASZNÁLÓNÉV (EGYEDI AZONOSÍTÓ)</label>
              <input
                className="form-input"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="pl. kissroli123"
              />
            </div>

            {isRegisterMode && (
                <div className="form-group" style={{ animation: "fadeIn 0.3s ease-out" }}>
                    <label className="form-label">MEGJELENÍTENDŐ NÉV</label>
                    <input
                        className="form-input"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                        placeholder="pl. Kiss Roland"
                    />
                </div>
            )}
        </div>

        {error && <div className="error-banner">{error}</div>}

        <button
          className="login-button"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? "Feldolgozás..." : (isRegisterMode ? "Felhasználó létrehozása" : "Belépés")}
        </button>

        <div className="mode-toggle">
            {isRegisterMode ? "Már van fiókod?" : "Még nincs felhasználód?"}{" "}
            <button className="toggle-link" onClick={toggleMode}>
                {isRegisterMode ? "Jelentkezz be itt" : "Regisztrálj most"}
            </button>
        </div>
      </div>
    </div>
  );
}