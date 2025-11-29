import { useState, useEffect } from "react";

const CORRECT_PASSWORD = "adminn";
const AUTH_KEY = "excalidraw_auth";

export const PasswordGate = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    // Check if already authenticated this session
    const auth = sessionStorage.getItem(AUTH_KEY);
    if (auth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, "true");
      setIsAuthenticated(true);
    } else {
      setError(true);
      setTimeout(() => setError(false), 1000);
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      background: "#1e1e1e",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <form onSubmit={handleSubmit} style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        padding: "32px",
        background: "#2d2d2d",
        borderRadius: "12px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
      }}>
        <h2 style={{ color: "#fff", margin: 0, textAlign: "center" }}>🔒</h2>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          style={{
            padding: "12px 16px",
            fontSize: "16px",
            border: error ? "2px solid #ff4444" : "2px solid #444",
            borderRadius: "8px",
            background: "#1e1e1e",
            color: "#fff",
            outline: "none",
            transition: "border-color 0.2s",
          }}
        />
        <button type="submit" style={{
          padding: "12px 24px",
          fontSize: "16px",
          background: "#6965db",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
        }}>
          Enter
        </button>
      </form>
    </div>
  );
};

