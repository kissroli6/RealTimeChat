import type { UserWithPresence } from "../../types/user";

interface UsersModalProps {
  isOpen: boolean;
  users: UserWithPresence[];
  error: string | null;
  onClose: () => void;
  onSelectUser: (user: UserWithPresence) => void;
}

export function UsersModal({
  isOpen,
  users,
  error,
  onClose,
  onSelectUser,
}: UsersModalProps) {
  if (!isOpen) return null;

  return (
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
            onClick={onClose}
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

        {error && (
          <p
            style={{
              color: "#ff6b6b",
              fontSize: "13px",
              marginBottom: "8px",
            }}
          >
            {error}
          </p>
        )}

        {users.map((u) => (
          <button
            key={u.id}
            onClick={() => onSelectUser(u)}
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

        {users.length === 0 && !error && (
          <p style={{ fontSize: "13px", color: "#777" }}>
            Nincs más felhasználó.
          </p>
        )}
      </div>
    </div>
  );
}
