import { useState } from "react";

interface LoginScreenProps {
  onLogin: (userName: string) => void;
  // ÚJ: Regisztrációs callback
  onRegister: (userName: string, displayName: string) => void;
  isLoading: boolean;
  error: string | null;
}

// ÚJ LOGÓ: Modern, egyszerű Chat ikon (Flixuart helyett)
function AppLogo() {
  return (
    <div style={{
      width: "80px", height: "80px",
      background: "linear-gradient(135deg, #A1DD29 0%, #7C58DC 100%)",
      borderRadius: "20px",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 10px 30px rgba(161, 221, 41, 0.2)"
    }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
      </svg>
    </div>
  );
}

export function LoginScreen({ onLogin, onRegister, isLoading, error }: LoginScreenProps) {
  // State a mód váltásához (false = Login, true = Register)
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  
  const [userName, setUserName] = useState("");
  const [displayName, setDisplayName] = useState("");

  const handleSubmit = () => {
    if (!userName.trim()) return;

    if (isRegisterMode) {
        // Regisztráció esetén kötelező a DisplayName is
        if (!displayName.trim()) return;
        onRegister(userName, displayName);
    } else {
        // Sima belépés
        onLogin(userName);
    }
  };

  const toggleMode = () => {
      setIsRegisterMode(!isRegisterMode);
      setUserName("");
      setDisplayName("");
      // Hibaüzeneteket a szülő komponens kezeli, de UI szinten tiszta lappal indulunk
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      width: "100vw",
      background: "linear-gradient(135deg, #1a1a2e 0%, #000000 50%, #0f1c0f 100%)",
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      fontFamily: "'Inter', system-ui, sans-serif" 
    }}>
      
      {/* Kártya */}
      <div style={{ 
        backgroundColor: "#111", 
        padding: "40px 32px", 
        borderRadius: "24px", 
        width: "100%", 
        maxWidth: "400px", 
        border: "1px solid #222",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}>
        
        {/* Logo */}
        <div style={{ marginBottom: "24px" }}>
          <AppLogo />
        </div>

        {/* Címsor */}
        <h1 style={{ fontSize: "24px", fontWeight: 800, margin: "0 0 8px 0", color: "#f5f5f5" }}>
          {isRegisterMode ? "Fiók létrehozása" : "Üdv újra!"}
        </h1>
        <p style={{ color: "#777", marginBottom: "32px", textAlign: "center", fontSize: "14px", lineHeight: "1.5" }}>
          {isRegisterMode 
            ? "Add meg az adataidat a csatlakozáshoz." 
            : "Add meg a felhasználóneved a belépéshez."}
        </p>

        {/* Form Container */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "16px", marginBottom: "16px" }}>
            
            {/* 1. INPUT: User Name */}
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "8px", fontWeight: 700, paddingLeft: "4px", textTransform: "uppercase" }}>
                FELHASZNÁLÓNÉV (EGYEDI AZONOSÍTÓ)
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="pl. kissroli123"
                style={{ 
                  width: "100%", 
                  boxSizing: "border-box",
                  padding: "14px 16px", 
                  borderRadius: "12px", 
                  border: "1px solid #333", 
                  backgroundColor: "#222", 
                  color: "#fff", 
                  fontSize: "15px", 
                  outline: "none"
                }}
              />
            </div>

            {/* 2. INPUT: Display Name (Csak regisztrációnál) */}
            {isRegisterMode && (
                <div style={{ animation: "fadeIn 0.3s ease-out" }}>
                    <label style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "8px", fontWeight: 700, paddingLeft: "4px", textTransform: "uppercase" }}>
                        MEGJELENÍTENDŐ NÉV
                    </label>
                    <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                        placeholder="pl. Kiss Roland"
                        style={{ 
                        width: "100%", 
                        boxSizing: "border-box",
                        padding: "14px 16px", 
                        borderRadius: "12px", 
                        border: "1px solid #333", 
                        backgroundColor: "#222", 
                        color: "#fff", 
                        fontSize: "15px", 
                        outline: "none"
                        }}
                    />
                    <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                </div>
            )}
        </div>

        {error && (
          <div style={{ width: "100%", boxSizing: "border-box", backgroundColor: "rgba(255, 107, 107, 0.1)", color: "#ff6b6b", fontSize: "13px", padding: "10px", borderRadius: "8px", marginBottom: "16px", textAlign: "center" }}>
            {error}
          </div>
        )}

        {/* Fő Gomb */}
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          style={{ 
            width: "100%", 
            padding: "14px", 
            borderRadius: "999px", 
            border: "none", 
            backgroundColor: "#A1DD29", 
            color: "#111", 
            cursor: isLoading ? "not-allowed" : "pointer", 
            fontWeight: 800, 
            fontSize: "15px",
            opacity: isLoading ? 0.7 : 1,
            transition: "transform 0.1s"
          }}
        >
          {isLoading ? "Feldolgozás..." : (isRegisterMode ? "Felhasználó létrehozása" : "Belépés")}
        </button>

        {/* Módváltó Gomb */}
        <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #222", width: "100%", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>
                {isRegisterMode ? "Már van fiókod?" : "Még nincs felhasználód?"}{" "}
                <button 
                    onClick={toggleMode}
                    style={{ 
                        background: "none", border: "none", padding: 0, 
                        color: "#f5f5f5", fontWeight: "bold", cursor: "pointer", 
                        textDecoration: "underline", fontSize: "14px" 
                    }}
                >
                    {isRegisterMode ? "Jelentkezz be itt" : "Regisztrálj most"}
                </button>
            </p>
        </div>

      </div>
    </div>
  );
}