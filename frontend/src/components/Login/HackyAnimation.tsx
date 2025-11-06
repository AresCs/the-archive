import { useEffect, useRef, useState } from "react";
import "./HackyAnimation.css";

type Props = {
  durationMs?: number;
  onFinish?: () => void;
};

type WindowModel = {
  id: number;
  title: string;
  lines: string[];
  typed: string[];
  activeLine: number;
  top: number;  
  left: number;   
  closing: boolean;
};

const TITLES = [
  "[ ACCESS WINDOW ]",
  "[ SECURE SHELL ]",
  "[ TRACE ROUTE ]",
  "[ ROOT@ARCHIVE ]",
  "[ PROXY TUNNEL ]",
];

const COMMANDS = [
  "nmap -sV 192.168.0.1",
  "ssh root@10.0.0.5",
  "decrypt --aes256 payload.bin",
  "proxychain ./infiltrate",
  "cat /etc/passwd",
  "grep -R \"admin\" /var/log",
  "mount /dev/sda1 /mnt",
  "rm -rf /tmp/cache",
  "ping -c 4 archive.node",
  "scp exploit.sh root@host:/tmp/",
  "curl -s https://archive.local/healthz",
  "whoami && id",
  "tail -n 50 /var/log/auth.log",
  "iptables -L --line-numbers",
  "dig +short archive.node",
];

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export default function HackyAnimation({ durationMs = 22000, onFinish }: Props) {
  const [wins, setWins] = useState<WindowModel[]>([]);
  const runRef = useRef(true);
  const idRef = useRef(0);
  const spawnTimer = useRef<number | null>(null);
  const typeTimer = useRef<number | null>(null);
  const stopAtRef = useRef<number>(0);

  // Spawn hack windows
  useEffect(() => {
    runRef.current = true;
    stopAtRef.current = Date.now() + durationMs;

    const spawn = () => {
      if (!runRef.current) return;
      if (Date.now() >= stopAtRef.current) return;

      // avoid login box & title
      const loginEl = document.getElementById("login-area");
      const titleEl =
        document.querySelector<HTMLElement>(".glitch") ||
        document.querySelector<HTMLElement>(".login-title");
      const banRects: DOMRect[] = [];
      if (titleEl) banRects.push(titleEl.getBoundingClientRect());
      if (loginEl) banRects.push(loginEl.getBoundingClientRect());

      const W = 300;
      const H = 200;
      let top = 0;
      let left = 0;
      const pad = 60;
      let safe = false;

      for (let tries = 0; tries < 60 && !safe; tries++) {
        top = Math.random() * (window.innerHeight - H - 20) + 10;
        left = Math.random() * (window.innerWidth - W - 20) + 10;
        const rect = new DOMRect(left, top, W, H);
        safe = !banRects.some((b) => {
          return !(
            rect.right < b.left - pad ||
            rect.left > b.right + pad ||
            rect.bottom < b.top - pad ||
            rect.top > b.bottom + pad
          );
        });
      }

      const linesCount = rand(5, 8);
      const lines = Array.from({ length: linesCount }, () => COMMANDS[rand(0, COMMANDS.length - 1)]);
      const model: WindowModel = {
        id: idRef.current++,
        title: TITLES[rand(0, TITLES.length - 1)],
        lines,
        typed: Array(linesCount).fill(""),
        activeLine: 0,
        top,
        left,
        closing: false,
      };

      setWins((prev) => [...prev, model]);

      const next = rand(700, 1300);
      spawnTimer.current = window.setTimeout(spawn, next);
    };

    spawn();

    return () => {
      runRef.current = false;
      if (spawnTimer.current) window.clearTimeout(spawnTimer.current);
    };
  }, [durationMs]);

  // Typing engine
  useEffect(() => {
    runRef.current = true;

    const tick = () => {
      if (!runRef.current) return;

      setWins((prev) =>
        prev.map((w) => {
          if (w.closing) return w;

          const i = w.activeLine;
          const target = w.lines[i];
          const current = w.typed[i] ?? "";

          if (current.length < target.length) {
            const nextTyped = w.typed.slice();
            // type 1–2 chars for a more organic feel
            const step = Math.random() < 0.25 ? 2 : 1;
            nextTyped[i] = target.slice(0, Math.min(current.length + step, target.length));
            return { ...w, typed: nextTyped };
          }

          // move to next line or close
          if (i < w.lines.length - 1) {
            return { ...w, activeLine: i + 1 };
          }

          // schedule close
          if (!w.closing) {
            window.setTimeout(() => {
              setWins((curr) => curr.map((x) => (x.id === w.id ? { ...x, closing: true } : x)));
              // remove from state shortly after
              window.setTimeout(() => {
                setWins((curr) => curr.filter((x) => x.id !== w.id));
              }, 180);
            }, 280);
          }
          return w;
        })
      );

      typeTimer.current = window.setTimeout(tick, rand(14, 34));
    };

    tick();

    // End-of-show cleanup
    const endTimer = window.setTimeout(() => {
      runRef.current = false;
      if (spawnTimer.current) window.clearTimeout(spawnTimer.current);
      if (typeTimer.current) window.clearTimeout(typeTimer.current);
      setWins([]);
      onFinish?.();
    }, durationMs);

    return () => {
      runRef.current = false;
      if (typeTimer.current) window.clearTimeout(typeTimer.current);
      window.clearTimeout(endTimer);
    };
  }, [durationMs, onFinish]);

  return (
    <div className="hacky-layer" aria-hidden>
      {wins.map((w) => (
        <div key={w.id} className="hack-win" style={{ top: w.top, left: w.left }}>
          <div className="hack-win__header">
            <span className="hack-win__title">{w.title}</span>
            <span className="hack-win__dots">
              <i className="dot dot--red" />
              <i className="dot dot--yellow" />
              <i className="dot dot--green" />
            </span>
          </div>
          <div className="hack-win__body">
            {w.lines.map((line, idx) => (
              <div key={idx} className="hack-line">
                <span className="prompt">$</span>{" "}
                {idx < w.activeLine ? line : idx === w.activeLine ? w.typed[idx] : ""}
                {idx === w.activeLine && <span className="cursor">█</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
