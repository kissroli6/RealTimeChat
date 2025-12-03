interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
}

export function MessageInput({ value, onChange, onSend }: MessageInputProps) {
  return (
    <div style={{ display: "flex", gap: "8px" }}>
      <input
        type="text"
        placeholder="Írj üzenetet..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSend();
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
        onClick={onSend}
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
  );
}
