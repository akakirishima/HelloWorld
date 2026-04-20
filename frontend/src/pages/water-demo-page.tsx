import type { ReactNode } from "react";
import { useRef, useState } from "react";

/* ─────────────────────────── CSS ────────────────────────────── */
const STYLES = `
@keyframes wave-x {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
@keyframes bubble-rise {
  0%   { transform: translateY(0) scale(1);   opacity: 0; }
  8%   { opacity: 0.75; }
  92%  { opacity: 0.75; }
  100% { transform: translateY(-320px) scale(1.4); opacity: 0; }
}
@keyframes shimmer-sweep {
  from { transform: translateX(-250%); }
  to   { transform: translateX(250%); }
}
@keyframes slosh {
  0%,100% { border-radius: 0 0 0 0 / 0 0 0 0; }
  25%      { border-radius: 40% 10% 40% 10% / 8% 8% 8% 8%; }
  75%      { border-radius: 10% 40% 10% 40% / 8% 8% 8% 8%; }
}
`;

/* ─────────────────────────── Hooks ──────────────────────────── */
const HOLD = 700;

function useFill() {
  const [prog, setProg] = useState(0);
  const [pressing, setPressing] = useState(false);
  const [filled, setFilled] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  const t0 = useRef(0);

  const down = () => {
    if (filled) { setFilled(false); setProg(0); return; }
    if (ref.current) clearInterval(ref.current);
    setPressing(true); setProg(0);
    t0.current = Date.now();
    ref.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0.current) / HOLD);
      setProg(p);
      if (p >= 1) { clearInterval(ref.current!); setPressing(false); setFilled(true); }
    }, 16);
  };

  const up = () => {
    if (filled) return;
    if (ref.current) clearInterval(ref.current);
    setPressing(false); setProg(0);
  };

  return { pct: filled ? 1 : prog, pressing, filled, down, up };
}

function useShimmerFill() {
  const [prog, setProg] = useState(0);
  const [pressing, setPressing] = useState(false);
  const [fillKey, setFillKey] = useState(0);
  const [filled, setFilled] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  const t0 = useRef(0);

  const down = () => {
    if (filled) { setFilled(false); setProg(0); return; }
    if (ref.current) clearInterval(ref.current);
    setPressing(true); setProg(0);
    t0.current = Date.now();
    ref.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0.current) / HOLD);
      setProg(p);
      if (p >= 1) {
        clearInterval(ref.current!);
        setPressing(false); setFilled(true);
        setFillKey((k) => k + 1);
      }
    }, 16);
  };

  const up = () => {
    if (filled) return;
    if (ref.current) clearInterval(ref.current);
    setPressing(false); setProg(0);
  };

  return { pct: filled ? 1 : prog, pressing, filled, fillKey, down, up };
}

function useSpringFill() {
  const [h, setH] = useState(0);
  const [pressing, setPressing] = useState(false);
  const [filled, setFilled] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  const t0 = useRef(0);
  const phase = useRef<"fill" | "spring" | "idle">("idle");

  const down = () => {
    if (filled) {
      if (ref.current) clearInterval(ref.current);
      phase.current = "idle"; setFilled(false); setH(0); setPressing(false); return;
    }
    if (ref.current) clearInterval(ref.current);
    phase.current = "fill"; setPressing(true); setH(0);
    t0.current = Date.now();
    ref.current = setInterval(() => {
      if (phase.current === "fill") {
        const p = Math.min(1, (Date.now() - t0.current) / HOLD);
        setH(p);
        if (p >= 1) { phase.current = "spring"; t0.current = Date.now(); setPressing(false); setFilled(true); }
      } else if (phase.current === "spring") {
        const t = Date.now() - t0.current;
        setH(1 + 0.15 * Math.exp(-t / 85) * Math.cos(t * 0.056));
        if (t > 700) { clearInterval(ref.current!); setH(1); phase.current = "idle"; }
      }
    }, 16);
  };

  const up = () => {
    if (phase.current !== "fill") return;
    if (ref.current) clearInterval(ref.current);
    phase.current = "idle"; setPressing(false); setH(0);
  };

  return { h: Math.max(0, Math.min(1.2, h)), pressing, filled, down, up };
}

/* ─────────────────────────── Shell ──────────────────────────── */
function Shell({
  jp, en, down, up, borderColor = "#94a3b8", children,
}: {
  jp: string; en: string;
  down: () => void; up: () => void;
  borderColor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-1.5 px-0.5">
        <span className="text-lg font-bold text-slate-800">{jp}</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{en}</span>
      </div>
      <button
        type="button"
        className="relative w-full overflow-hidden rounded-[20px] border-2 bg-white select-none focus:outline-none"
        style={{ height: 150, borderColor }}
        onPointerDown={down}
        onPointerUp={up}
        onPointerLeave={up}
        onPointerCancel={up}
      >
        {children}
        <span className="absolute bottom-2.5 left-0 right-0 z-30 text-center text-[10px] font-medium text-slate-300 pointer-events-none">
          hold · tap to reset
        </span>
      </button>
    </div>
  );
}

/* ─────────────────────────── A: 波 ──────────────────────────── */
function CardWave() {
  const { pct, pressing, down, up } = useFill();
  return (
    <Shell jp="波" en="wave" down={down} up={up} borderColor="#7dd3fc">
      {/* solid fill */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: `${pct * 100}%`,
          background: "#38bdf8",
          transition: pressing ? "none" : "height 250ms ease-out",
        }}
      />
      {/* wave at surface */}
      {pct > 0.01 && (
        <div
          className="absolute left-0 right-0 pointer-events-none overflow-hidden"
          style={{
            height: 28,
            bottom: `calc(${pct * 100}% - 14px)`,
            transition: pressing ? "none" : "bottom 250ms ease-out",
          }}
        >
          <svg
            viewBox="0 0 400 28"
            preserveAspectRatio="none"
            style={{
              position: "absolute", top: 0, left: 0,
              width: "200%", height: "100%",
              animation: "wave-x 1.8s linear infinite",
            }}
          >
            <path
              d="M0,14 C25,3 75,25 100,14 C125,3 175,25 200,14 C225,3 275,25 300,14 C325,3 375,25 400,14 L400,28 L0,28 Z"
              fill="#38bdf8"
            />
          </svg>
        </div>
      )}
    </Shell>
  );
}

/* ─────────────────────────── B: 揺れ ───────────────────────── */
function CardSlosh() {
  const { pct, pressing, down, up } = useFill();
  return (
    <Shell jp="揺れ" en="slosh" down={down} up={up} borderColor="#67e8f9">
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: `${pct * 100}%`,
          background: "linear-gradient(to top, #0e7490, #22d3ee)",
          transition: pressing ? "none" : "height 250ms ease-out",
          animation: pressing ? "slosh 0.55s ease-in-out infinite" : undefined,
          transformOrigin: "bottom center",
        }}
      />
    </Shell>
  );
}

/* ─────────────────────────── C: 跳ね ───────────────────────── */
function CardBounce() {
  const { h, pressing, down, up } = useSpringFill();
  return (
    <Shell jp="跳ね" en="bounce" down={down} up={up} borderColor="#c4b5fd">
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: `${h * 100}%`,
          background: "linear-gradient(to top, #6d28d9, #a78bfa)",
          transition: pressing ? "none" : "height 250ms ease-out",
        }}
      />
    </Shell>
  );
}

/* ─────────────────────────── D: 泡 ─────────────────────────── */
const BUBBLES = [
  { left: "18%", size: 8,  delay: "0s",    dur: "2.2s" },
  { left: "36%", size: 5,  delay: "0.4s",  dur: "1.8s" },
  { left: "52%", size: 10, delay: "0.9s",  dur: "2.6s" },
  { left: "67%", size: 6,  delay: "0.2s",  dur: "2.0s" },
  { left: "80%", size: 7,  delay: "1.1s",  dur: "2.4s" },
  { left: "28%", size: 4,  delay: "1.5s",  dur: "1.6s" },
];

function CardBubble() {
  const { pct, pressing, down, up } = useFill();
  return (
    <Shell jp="泡" en="bubble" down={down} up={up} borderColor="#93c5fd">
      <div
        className="absolute bottom-0 left-0 right-0 overflow-hidden"
        style={{
          height: `${pct * 100}%`,
          background: "#3b82f6",
          transition: pressing ? "none" : "height 250ms ease-out",
        }}
      >
        {pct > 0.05 &&
          BUBBLES.map((b, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-white/40 bg-white/25"
              style={{
                left: b.left,
                bottom: 4,
                width: b.size,
                height: b.size,
                animation: `bubble-rise ${b.dur} ${b.delay} ease-in infinite`,
              }}
            />
          ))}
      </div>
    </Shell>
  );
}

/* ─────────────────────────── E: 深 ─────────────────────────── */
function CardDeep() {
  const { pct, pressing, down, up } = useFill();
  return (
    <Shell jp="深" en="deep" down={down} up={up} borderColor="#818cf8">
      {/* depth gradient fill — light at top, dark at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: `${pct * 100}%`,
          background: "linear-gradient(to top, #1e1b4b, #3730a3, #818cf8)",
          transition: pressing ? "none" : "height 250ms ease-out",
        }}
      />
      {/* caustic shimmer lines */}
      {pct > 0.1 && (
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none overflow-hidden"
          style={{
            height: `${pct * 100}%`,
            transition: pressing ? "none" : "height 250ms ease-out",
          }}
        >
          {[15, 35, 55, 75, 90].map((x) => (
            <div
              key={x}
              className="absolute top-0 bottom-0"
              style={{
                left: `${x}%`,
                width: 1,
                background: "linear-gradient(to bottom, rgba(255,255,255,0.18) 0%, transparent 60%)",
                animation: `wave-x ${1.4 + x * 0.02}s linear infinite`,
              }}
            />
          ))}
        </div>
      )}
    </Shell>
  );
}

/* ─────────────────────────── F: 雫 ─────────────────────────── */
function CardDrop() {
  const { pct, pressing, down, up } = useFill();
  const r = pct * 260;
  return (
    <Shell jp="雫" en="drop" down={down} up={up} borderColor="#5eead4">
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, #0d9488, #2dd4bf)",
          clipPath: `ellipse(${r}px ${r}px at 50% 100%)`,
          transition: pressing ? "none" : "clip-path 300ms cubic-bezier(0.34,1.56,0.64,1)",
        }}
      />
    </Shell>
  );
}

/* ─────────────────────────── G: 霧 ─────────────────────────── */
function CardMist() {
  const { pct, pressing, down, up } = useFill();
  return (
    <Shell jp="霧" en="mist" down={down} up={up} borderColor="#94a3b8">
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: `${pct * 100}%`,
          background: "#64748b",
          WebkitMaskImage: "linear-gradient(to top, black 55%, transparent 100%)",
          maskImage: "linear-gradient(to top, black 55%, transparent 100%)",
          transition: pressing ? "none" : "height 250ms ease-out",
        }}
      />
    </Shell>
  );
}

/* ─────────────────────────── H: 閃 ─────────────────────────── */
function CardShine() {
  const { pct, pressing, filled, fillKey, down, up } = useShimmerFill();
  return (
    <Shell jp="閃" en="shine" down={down} up={up} borderColor="#fcd34d">
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: `${pct * 100}%`,
          background: "linear-gradient(to top, #b45309, #f59e0b, #fcd34d)",
          transition: pressing ? "none" : "height 250ms ease-out",
        }}
      />
      {filled && (
        <div
          key={fillKey}
          className="absolute inset-0 z-10 pointer-events-none overflow-hidden"
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)",
              animation: "shimmer-sweep 0.75s ease-out forwards",
            }}
          />
        </div>
      )}
    </Shell>
  );
}

/* ─────────────────────────── Page ──────────────────────────── */
export function WaterDemoPage() {
  return (
    <>
      <style>{STYLES}</style>
      <div className="min-h-screen bg-[linear-gradient(180deg,_#f4f8fb_0%,_#eef3f2_100%)] px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Demo</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">水のような塗りつぶし</h1>
            <p className="mt-2 text-sm text-slate-500">各カードを長押しして塗りつぶし。タップでリセット。</p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
            <CardWave />
            <CardSlosh />
            <CardBounce />
            <CardBubble />
            <CardDeep />
            <CardDrop />
            <CardMist />
            <CardShine />
          </div>

          <p className="mt-8 text-center text-xs text-slate-300">
            <a href="/demo/animations" className="underline hover:text-slate-500">← animation demo</a>
          </p>
        </div>
      </div>
    </>
  );
}
