import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import { api } from "../../lib/api";
import type { Agent } from "../../types";

type Props = {
  onLogin: (user: Agent) => void;
};

export default function Login({ onLogin }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const navigate = useNavigate();

  // Delay login UI appearance
  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowLogin(true);
    }, 7500);
    return () => clearTimeout(timeout);
  }, []);

  // Random “eyes” animation
  useEffect(() => {
    const eyeImages = [
      "/images/eye1.png",
      "/images/eye2.png",
      "/images/eye3.png",
      "/images/eye4.png",
      "/images/eye1.gif",
    ];

    interface EyeElement extends HTMLImageElement {
      __fadeIn?: number;
      __fadeOut?: number;
      __removeTimer?: number;
    }

    function createRandomEyes() {
      const numEyes = Math.floor(Math.random() * 4) + 2;

      for (let i = 0; i < numEyes; i++) {
        const eye = document.createElement("img") as EyeElement;
        eye.src = eyeImages[Math.floor(Math.random() * eyeImages.length)];
        eye.classList.add("eyes");
        document.body.appendChild(eye);

        const loginBox = document.getElementById("login-area");
        const loginRect = loginBox?.getBoundingClientRect();

        let x = 0,
          y = 0,
          isOverlapping = true;

        while (isOverlapping) {
          x = Math.random() * (window.innerWidth - 100);
          y = Math.random() * (window.innerHeight - 100);

          if (
            !loginRect ||
            x + 50 < loginRect.left ||
            x > loginRect.right ||
            y + 50 < loginRect.top ||
            y > loginRect.bottom
          ) {
            isOverlapping = false;
          }
        }

        eye.style.left = `${x}px`;
        eye.style.top = `${y}px`;
        eye.style.transform = `scale(${Math.random() * 1.5 + 0.5})`;

        eye.__fadeIn = window.setTimeout(() => {
          eye.style.opacity = "1";
        }, Math.random() * 1000);

        eye.__fadeOut = window.setTimeout(() => {
          eye.style.opacity = "0";
          eye.__removeTimer = window.setTimeout(() => eye.remove(), 1000);
        }, Math.random() * 4000 + 3000);
      }
    }

    const interval = setInterval(createRandomEyes, Math.random() * 7000 + 3000);

    return () => {
      clearInterval(interval);
      document.querySelectorAll<HTMLImageElement>("img.eyes").forEach((el) => {
        const eye = el as EyeElement;
        if (eye.__fadeIn) clearTimeout(eye.__fadeIn);
        if (eye.__fadeOut) clearTimeout(eye.__fadeOut);
        if (eye.__removeTimer) clearTimeout(eye.__removeTimer);
        eye.remove();
      });
    };
  }, []);

  const handleLogin = async () => {
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Please enter username and password.");
      return;
    }

    try {
      // Expecting backend to return: { user: { id, name, rank, clearance, ... } }
      const data = await api.post<{ user: Agent }>("/api/login", {
        username,
        password,
      });

      const user = data.user;
      if (!user?.id) {
        setError("Invalid login response.");
        return;
      }

      onLogin(user); // pass up to App
      navigate("/home");
    } catch (err) {
      console.error("Login error:", err);
      setError("Could not connect or invalid credentials.");
    }
  };

  return (
    <div>
      <div className="animation-container"></div>

      <div className={`screen-wrapper ${showLogin ? "visible" : ""}`}>
        <h1 className="glitch">The Archive</h1>
        <div id="login-area" className="login-container">
          <h2 className="login-subtitle">No one escapes the records</h2>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            aria-label="Username"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Password"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLogin();
            }}
          />
          <button onClick={handleLogin}>Proceed</button>
          {error && <p style={{ color: "red", marginTop: "1rem" }}>{error}</p>}
        </div>
      </div>

      <div className="mist"></div>
    </div>
  );
}
