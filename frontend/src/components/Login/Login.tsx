import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import HackyAnimation from "./HackyAnimation";
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

  // Eyes layer
  const eyesLayerRef = useRef<HTMLDivElement | null>(null);
  const spawnTimerRef = useRef<number | null>(null);

  // After hack windows finish, show the login UI
  const HACK_DURATION_MS = 22000;

  // Spawn “shadow eyes” PNGs after login is visible
  useEffect(() => {
    if (!showLogin) return;

    type EyeElement = HTMLImageElement & {
      __removeTimer?: number;
      __fadeTimer?: number;
    };

    const layer = eyesLayerRef.current;
    if (!layer) return;

    const eyeSrcs = [
      "/images/login/eyes/eye1.png",
      "/images/login/eyes/eye2.png",
      "/images/login/eyes/eye3.png",
      "/images/login/eyes/eye4.png",
    ];

    let destroyed = false;

    const spawnOne = () => {
      if (destroyed) return;

      const loginBox = document.getElementById("login-area");
      const titleEl =
        (document.querySelector(".login-title.glitch") as HTMLElement | null) ??
        null;

      const safeRects: DOMRect[] = [];
      if (loginBox) safeRects.push(loginBox.getBoundingClientRect());
      if (titleEl) safeRects.push(titleEl.getBoundingClientRect());

      const img = document.createElement("img") as EyeElement;
      img.src = eyeSrcs[Math.floor(Math.random() * eyeSrcs.length)];
      img.className = "shadow-eye";

      // find a safe random spot
      const pad = 50;
      let x = 0;
      let y = 0;
      let ok = false;
      const w = 120;
      const h = 40;

      for (let tries = 0; tries < 60 && !ok; tries++) {
        x = Math.random() * (window.innerWidth - (w + 20)) + 10;
        y = Math.random() * (window.innerHeight - (h + 20)) + 10;

        const r = new DOMRect(x, y, w, h);
        ok = !safeRects.some((b) => {
          return !(
            r.right < b.left - pad ||
            r.left > b.right + pad ||
            r.bottom < b.top - pad ||
            r.top > b.bottom + pad
          );
        });
      }

      img.style.left = `${x}px`;
      img.style.top = `${y}px`;

      layer.appendChild(img);
      requestAnimationFrame(() => img.classList.add("in"));

      const visibleMs = Math.floor(Math.random() * 4000) + 2800;
      img.__removeTimer = window.setTimeout(() => {
        img.classList.remove("in");
        img.__fadeTimer = window.setTimeout(() => {
          img.remove();
        }, 450);
      }, visibleMs);
    };

    const loop = () => {
      spawnOne();
      spawnTimerRef.current = window.setTimeout(loop, Math.random() * 1200 + 700);
    };

    loop();

    return () => {
      destroyed = true;
      if (spawnTimerRef.current) {
        window.clearTimeout(spawnTimerRef.current);
        spawnTimerRef.current = null;
      }
      layer.querySelectorAll<HTMLImageElement>(".shadow-eye").forEach((el) => {
        const e = el as EyeElement;
        if (e.__removeTimer) window.clearTimeout(e.__removeTimer);
        if (e.__fadeTimer) window.clearTimeout(e.__fadeTimer);
        e.remove();
      });
    };
  }, [showLogin]);

  const handleLogin = async (): Promise<void> => {
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Please enter username and password.");
      return;
    }

    try {
      // ⬇️ expect { user, token } from backend
      const data = await api.post<{ user: Agent; token: string }>(
        "/api/login",
        {
          username,
          password,
        },
        { credentials: "include" } // ensure cookie set
      );

      const user = data.user;
      const token = data.token;

      if (!user?.id || !token) {
        setError("Invalid login response.");
        return;
      }

      // persist both
      onLogin(user);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token", token);

      // Optional: call api.setToken if your api client supports it (no `any`)
      type ApiWithSetToken = typeof api & { setToken?: (t: string) => void };
      const maybeApi: ApiWithSetToken = api as ApiWithSetToken;
      if (typeof maybeApi.setToken === "function") {
        maybeApi.setToken(token);
      }

      navigate("/home");
    } catch (err: unknown) {
      // keep ESLint happy with explicit typing
      const msg =
        err instanceof Error ? err.message : "Could not connect or invalid credentials.";
      console.error("Login error:", err);
      setError(msg);
    }
  };

  return (
    <div>
      {!showLogin && (
        <HackyAnimation
          durationMs={HACK_DURATION_MS}
          onFinish={() => setShowLogin(true)}
        />
      )}

      <div className={`login-viewport ${showLogin ? "is-visible" : ""}`}>
        <h1 className="login-title glitch">The Archive</h1>

        <div id="login-area" className="login-card">
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
              if (e.key === "Enter") void handleLogin();
            }}
          />

          <button onClick={() => void handleLogin()}>Proceed</button>
          {error && <p className="login-error">{error}</p>}
        </div>
      </div>

      <div
        ref={eyesLayerRef}
        className={`eyes-layer ${showLogin ? "active" : ""}`}
        aria-hidden
      />
    </div>
  );
}
