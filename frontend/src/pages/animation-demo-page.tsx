import { useCallback, useRef, useState } from "react";

import { FlaskConical, GraduationCap, Home } from "lucide-react";

import { cn } from "@/lib/utils";

type Section = "lab" | "class" | "home";
const sections: { key: Section; label: string; Icon: typeof FlaskConical }[] = [
  { key: "lab",   label: "Lab",   Icon: FlaskConical },
  { key: "class", label: "Class", Icon: GraduationCap },
  { key: "home",  label: "Home",  Icon: Home },
];
const sectionIndex: Record<Section, number> = { lab: 0, class: 1, home: 2 };

// ─── 共通スタイル ───────────────────────────────────────────────
const cardBase = "rounded-[28px] border shadow-md overflow-hidden flex flex-col w-full";
const headerBase = "px-4 py-3 text-center border-b font-semibold text-sm tracking-wide";
const bodyBase = "flex flex-1";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案A: スライディングピル
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardA() {
  const [active, setActive] = useState<Section>("lab");
  const idx = sectionIndex[active];

  return (
    <div className={cn(cardBase, "border-emerald-200 bg-white")}>
      <div className={cn(headerBase, "bg-emerald-100 border-emerald-200 text-emerald-900")}>
        案A｜スライディングピル
      </div>
      <div className={cn(bodyBase, "relative bg-emerald-50")}>
        {/* スライドするピル背景 */}
        <div
          className="absolute inset-y-0 w-1/3 bg-emerald-200 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{ transform: `translateX(${idx * 100}%)` }}
        />
        {sections.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            className="relative z-10 flex flex-1 flex-col items-center justify-center gap-2 py-5 transition-colors"
            onClick={() => setActive(key)}
          >
            <Icon
              className={cn("transition-colors duration-300", active === key ? "text-emerald-700" : "text-emerald-300")}
              size={32}
              strokeWidth={2}
            />
            <span className={cn("text-xs font-semibold capitalize transition-colors duration-300", active === key ? "text-emerald-900" : "text-emerald-300")}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案B: ドラッグスナップ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardB() {
  const [active, setActive] = useState<Section>("lab");
  const [dragging, setDragging] = useState(false);
  const [dragX, setDragX] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startIdx = useRef(0);

  const currentIdx = dragging && dragX !== null
    ? Math.max(0, Math.min(2, Math.round(dragX)))
    : sectionIndex[active];

  const pillLeft = dragging && dragX !== null
    ? `${Math.max(0, Math.min(2, dragX)) * 33.333}%`
    : `${sectionIndex[active] * 33.333}%`;

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width * 3;
    startX.current = e.clientX;
    startIdx.current = Math.max(0, Math.min(2, Math.floor(relX)));
    setDragging(true);
    setDragX(startIdx.current);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const delta = (e.clientX - startX.current) / rect.width * 3;
    setDragX(startIdx.current + delta);
  }, [dragging]);

  const onPointerUp = useCallback(() => {
    if (!dragging) return;
    const snapped = Math.max(0, Math.min(2, Math.round(dragX ?? startIdx.current)));
    setActive(sections[snapped].key);
    setDragging(false);
    setDragX(null);
  }, [dragging, dragX]);

  return (
    <div className={cn(cardBase, "border-sky-200 bg-white")}>
      <div className={cn(headerBase, "bg-sky-100 border-sky-200 text-sky-900")}>
        案B｜ドラッグスナップ
      </div>
      <div
        ref={containerRef}
        className={cn(bodyBase, "relative bg-sky-50 cursor-grab active:cursor-grabbing touch-none select-none")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* ドラッグピル */}
        <div
          className={cn(
            "absolute inset-y-0 w-1/3 bg-sky-200",
            dragging ? "" : "transition-[left] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          )}
          style={{ left: pillLeft }}
        />
        {sections.map(({ key, label, Icon }, i) => (
          <div
            key={key}
            className="relative z-10 flex flex-1 flex-col items-center justify-center gap-2 py-5"
          >
            <Icon
              className={cn("transition-colors duration-200", currentIdx === i ? "text-sky-700" : "text-sky-300")}
              size={32}
              strokeWidth={2}
            />
            <span className={cn("text-xs font-semibold capitalize transition-colors duration-200", currentIdx === i ? "text-sky-900" : "text-sky-300")}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案C: カードスワイプ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardC() {
  const [active, setActive] = useState<Section>("lab");
  const [swipeDx, setSwipeDx] = useState(0);
  const startX = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    startX.current = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (startX.current === null) return;
    setSwipeDx(e.clientX - startX.current);
  }, []);

  const onPointerUp = useCallback(() => {
    if (startX.current === null) return;
    if (swipeDx < -40) {
      const idx = Math.min(2, sectionIndex[active] + 1);
      setActive(sections[idx].key);
    } else if (swipeDx > 40) {
      const idx = Math.max(0, sectionIndex[active] - 1);
      setActive(sections[idx].key);
    }
    startX.current = null;
    setSwipeDx(0);
  }, [swipeDx, active]);

  const tilt = Math.max(-8, Math.min(8, swipeDx * 0.04));
  const translateX = Math.max(-24, Math.min(24, swipeDx * 0.15));

  return (
    <div
      ref={cardRef}
      className={cn(cardBase, "border-violet-200 bg-white cursor-grab active:cursor-grabbing touch-none select-none")}
      style={{
        transform: `translateX(${translateX}px) rotate(${tilt}deg)`,
        transition: swipeDx === 0 ? "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)" : "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div className={cn(headerBase, "bg-violet-100 border-violet-200 text-violet-900")}>
        案C｜カードスワイプ ← →
      </div>
      <div className={cn(bodyBase, "bg-violet-50 divide-x divide-violet-200")}>
        {sections.map(({ key, label, Icon }) => (
          <div key={key} className={cn("flex flex-1 flex-col items-center justify-center gap-2 py-5", active === key && "bg-violet-100")}>
            {active === key ? (
              <span className="inline-flex items-center justify-center rounded-full border-2 border-violet-400 bg-violet-500 p-2">
                <Icon className="text-white" size={24} strokeWidth={2.25} />
              </span>
            ) : (
              <Icon className="text-violet-300" size={32} strokeWidth={2} />
            )}
            <span className={cn("text-xs font-semibold capitalize", active === key ? "text-violet-900" : "text-violet-300")}>
              {label}
            </span>
          </div>
        ))}
      </div>
      <div className="bg-violet-50 px-3 pb-2 text-center text-[10px] text-violet-400">
        ← 左右にスワイプ →
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案D: 丸が弾んで移動（バウンス）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardD() {
  const [active, setActive] = useState<Section>("lab");
  const [prev, setPrev] = useState<Section | null>(null);
  const [animKey, setAnimKey] = useState(0);

  const handleClick = (key: Section) => {
    if (key === active) return;
    setPrev(active);
    setActive(key);
    setAnimKey(k => k + 1);
  };

  return (
    <div className={cn(cardBase, "border-rose-200 bg-white")}>
      <style>{`
        @keyframes bounce-in {
          0%   { transform: scale(0.2); opacity: 0.3; }
          55%  { transform: scale(1.35); opacity: 1; }
          75%  { transform: scale(0.88); }
          100% { transform: scale(1); }
        }
        .bounce-in { animation: bounce-in 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        @keyframes shrink-out {
          0%   { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.2); opacity: 0; }
        }
        .shrink-out { animation: shrink-out 0.2s ease-in forwards; }
      `}</style>
      <div className={cn(headerBase, "bg-rose-100 border-rose-200 text-rose-900")}>
        案D｜丸がバウンス
      </div>
      <div className={cn(bodyBase, "bg-rose-50 divide-x divide-rose-200")}>
        {sections.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            className={cn("flex flex-1 flex-col items-center justify-center gap-2 py-5 transition-colors", active === key && "bg-rose-100")}
            onClick={() => handleClick(key)}
          >
            {active === key ? (
              <span
                key={animKey}
                className="bounce-in inline-flex items-center justify-center rounded-full border-2 border-rose-400 bg-rose-500 p-2"
              >
                <Icon className="text-white" size={24} strokeWidth={2.25} />
              </span>
            ) : prev === key ? (
              <span key={`out-${animKey}`} className="shrink-out inline-flex items-center justify-center rounded-full border-2 border-rose-400 bg-rose-500 p-2">
                <Icon className="text-white" size={24} strokeWidth={2.25} />
              </span>
            ) : (
              <Icon className="text-rose-300" size={32} strokeWidth={2} />
            )}
            <span className={cn("text-xs font-semibold capitalize", active === key ? "text-rose-900" : "text-rose-300")}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案E: A+B ハイブリッド（スライディングピル＋ドラッグ）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardE() {
  const [active, setActive] = useState<Section>("lab");
  const [dragging, setDragging] = useState(false);
  const [dragX, setDragX] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startIdx = useRef(0);

  const currentIdx = dragging && dragX !== null
    ? Math.max(0, Math.min(2, Math.round(dragX)))
    : sectionIndex[active];

  const pillPos = dragging && dragX !== null
    ? Math.max(0, Math.min(2, dragX)) * 33.333
    : sectionIndex[active] * 33.333;

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width * 3;
    startX.current = e.clientX;
    startIdx.current = Math.max(0, Math.min(2, Math.floor(relX)));
    setDragging(true);
    setDragX(startIdx.current);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const delta = (e.clientX - startX.current) / rect.width * 3;
    setDragX(startIdx.current + delta);
  }, [dragging]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging || !containerRef.current) return;
    const dx = Math.abs(e.clientX - startX.current);
    if (dx < 8) {
      // タップ判定
      const rect = containerRef.current.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width * 3;
      const tapped = Math.max(0, Math.min(2, Math.floor(relX)));
      setActive(sections[tapped].key);
    } else {
      const snapped = Math.max(0, Math.min(2, Math.round(dragX ?? startIdx.current)));
      setActive(sections[snapped].key);
    }
    setDragging(false);
    setDragX(null);
  }, [dragging, dragX]);

  return (
    <div className={cn(cardBase, "border-amber-200 bg-white")}>
      <div className={cn(headerBase, "bg-amber-100 border-amber-200 text-amber-900")}>
        案E｜ピル＋ドラッグ（ハイブリッド）
      </div>
      <div
        ref={containerRef}
        className={cn(bodyBase, "relative bg-amber-50 cursor-grab active:cursor-grabbing touch-none select-none")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div
          className={cn(
            "absolute inset-y-2 w-1/3 rounded-2xl bg-amber-200 shadow-sm",
            dragging ? "" : "transition-[left] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          )}
          style={{ left: `calc(${pillPos}% + 4px)`, width: "calc(33.333% - 8px)" }}
        />
        {sections.map(({ key, label, Icon }, i) => (
          <div
            key={key}
            className="relative z-10 flex flex-1 flex-col items-center justify-center gap-2 py-5"
          >
            <Icon
              className={cn("transition-colors duration-200", currentIdx === i ? "text-amber-700" : "text-amber-300")}
              size={32}
              strokeWidth={2}
            />
            <span className={cn("text-xs font-semibold capitalize transition-colors duration-200", currentIdx === i ? "text-amber-900" : "text-amber-300")}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案F: 2D自由ドラッグ＋アイコン上でドロップ確定＋バウンス
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardF() {
  const [active, setActive] = useState<Section>("lab");
  const [animKey, setAnimKey] = useState(0);
  const [prev, setPrev] = useState<Section | null>(null);
  // ドラッグ中の浮遊丸の座標（コンテナ相対 px）
  const [floatPos, setFloatPos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startClientPos = useRef({ x: 0, y: 0 });
  const isDragging = floatPos !== null;

  // ポインタ位置からホバー中のセクションを返す（X軸で判定）
  const getSectionAtX = useCallback((relX: number): Section => {
    if (relX < 1 / 3) return "lab";
    if (relX < 2 / 3) return "class";
    return "home";
  }, []);

  // ホバー中セクション（ドラッグ中のみ）
  const hoverSection: Section | null = (isDragging && containerRef.current)
    ? getSectionAtX(floatPos!.x / containerRef.current.getBoundingClientRect().width)
    : null;

  const commit = useCallback((key: Section) => {
    setPrev(active);
    setActive(key);
    setAnimKey(k => k + 1);
  }, [active]);

  // 丸のみ: pointerDown で掴む
  const onCirclePointerDown = useCallback((e: React.PointerEvent<HTMLSpanElement>) => {
    if (!containerRef.current) return;
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    startClientPos.current = { x: e.clientX, y: e.clientY };
    setFloatPos({
      x: Math.max(0, Math.min(rect.width,  e.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, e.clientY - rect.top)),
    });
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  // コンテナ全体: move / up を受け取る（capture中は外に出ても追跡できる）
  const onContainerPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setFloatPos({
      x: Math.max(0, Math.min(rect.width,  e.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, e.clientY - rect.top)),
    });
  }, [isDragging]);

  const onContainerPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const target = getSectionAtX(relX);
    commit(target);
    setFloatPos(null);
  }, [isDragging, commit, getSectionAtX]);

  return (
    <div className={cn(cardBase, "border-teal-300 bg-white col-span-2 sm:col-span-1")}>
      <style>{`
        @keyframes f-bounce-in {
          0%   { transform: scale(0.1); opacity: 0; }
          55%  { transform: scale(1.35); opacity: 1; }
          75%  { transform: scale(0.88); }
          100% { transform: scale(1); }
        }
        .f-bounce-in { animation: f-bounce-in 0.42s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        @keyframes f-shrink-out {
          0%   { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.1); opacity: 0; }
        }
        .f-shrink-out { animation: f-shrink-out 0.18s ease-in forwards; }
      `}</style>
      <div className={cn(headerBase, "bg-teal-100 border-teal-200 text-teal-900")}>
        案F｜丸のみ2Dドラッグ＋バウンス
      </div>
      <div
        ref={containerRef}
        className={cn(bodyBase, "relative select-none touch-none", isDragging && "cursor-grabbing")}
        onPointerMove={onContainerPointerMove}
        onPointerUp={onContainerPointerUp}
      >
        {/* セクション列（ボタンタップで選択） */}
        {sections.map(({ key, label, Icon }) => {
          const isActive = active === key;
          const isHover = isDragging && hoverSection === key;
          return (
            <button
              key={key}
              type="button"
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-2 py-5 transition-colors duration-150",
                isHover && "bg-teal-100/70",
              )}
              onClick={() => { if (!isDragging) commit(key); }}
            >
              {isActive && !isDragging ? (
                // 確定丸（ドラッグ可能）
                <span
                  key={`in-${animKey}`}
                  className="f-bounce-in inline-flex cursor-grab items-center justify-center rounded-full border-2 border-teal-500 bg-teal-500 p-2 active:cursor-grabbing"
                  onPointerDown={onCirclePointerDown}
                >
                  <Icon className="text-white" size={24} strokeWidth={2.25} />
                </span>
              ) : isActive && isDragging ? (
                // ゴースト丸
                <span className="inline-flex items-center justify-center rounded-full border-2 border-teal-300 bg-teal-200 p-2 opacity-40">
                  <Icon className="text-teal-600" size={24} strokeWidth={2.25} />
                </span>
              ) : key === prev && !isDragging ? (
                <span
                  key={`out-${animKey}`}
                  className="f-shrink-out inline-flex items-center justify-center rounded-full border-2 border-teal-500 bg-teal-500 p-2"
                >
                  <Icon className="text-white" size={24} strokeWidth={2.25} />
                </span>
              ) : (
                <Icon
                  className={cn("transition-colors duration-150", isHover ? "text-teal-600" : "text-teal-300")}
                  size={32}
                  strokeWidth={2}
                />
              )}
              <span className={cn(
                "text-xs font-semibold capitalize transition-colors duration-150",
                isHover ? "text-teal-700" : isActive ? "text-teal-900" : "text-teal-300",
              )}>
                {label}
              </span>
            </button>
          );
        })}

        {/* 浮遊丸（ドラッグ中のみ） */}
        {isDragging && floatPos && (
          <span
            className="pointer-events-none absolute z-20 inline-flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-teal-600 bg-teal-500 p-2 shadow-lg"
            style={{ left: floatPos.x, top: floatPos.y }}
          >
            {(() => { const { Icon } = sections[sectionIndex[active]]; return <Icon className="text-white" size={24} strokeWidth={2.25} />; })()}
          </span>
        )}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案G: スタンプ（上から落下してドン！）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardG() {
  const [active, setActive] = useState<Section>("lab");
  const [animKey, setAnimKey] = useState(0);
  const [prev, setPrev] = useState<Section | null>(null);

  const handleSelect = (key: Section) => {
    if (key === active) return;
    setPrev(active);
    setActive(key);
    setAnimKey(k => k + 1);
  };

  return (
    <div className={cn(cardBase, "border-orange-200 bg-white")}>
      <style>{`
        @keyframes g-stamp {
          0%   { transform: translateY(-40px) scaleY(1); opacity: 0; }
          60%  { transform: translateY(4px) scaleY(0.7); opacity: 1; }
          75%  { transform: translateY(-3px) scaleY(1.1); }
          88%  { transform: translateY(2px) scaleY(0.95); }
          100% { transform: translateY(0) scaleY(1); }
        }
        .g-stamp { animation: g-stamp 0.38s cubic-bezier(0.22,1,0.36,1) forwards; }
        @keyframes g-poof {
          0%   { transform: scale(1); opacity: 1; }
          40%  { transform: scale(1.4) translateY(4px); opacity: 0.5; }
          100% { transform: scale(0.3) translateY(8px); opacity: 0; }
        }
        .g-poof { animation: g-poof 0.22s ease-in forwards; }
      `}</style>
      <div className={cn(headerBase, "bg-orange-100 border-orange-200 text-orange-900")}>案G｜スタンプ落下</div>
      <div className={cn(bodyBase, "bg-orange-50 divide-x divide-orange-200")}>
        {sections.map(({ key, label, Icon }) => (
          <button key={key} type="button"
            className={cn("flex flex-1 flex-col items-center justify-center gap-2 py-5 transition-colors", active === key && "bg-orange-100")}
            onClick={() => handleSelect(key)}
          >
            {active === key ? (
              <span key={`in-${animKey}`} className="g-stamp inline-flex items-center justify-center rounded-full border-2 border-orange-500 bg-orange-500 p-2">
                <Icon className="text-white" size={24} strokeWidth={2.25} />
              </span>
            ) : prev === key ? (
              <span key={`out-${animKey}`} className="g-poof inline-flex items-center justify-center rounded-full border-2 border-orange-500 bg-orange-500 p-2">
                <Icon className="text-white" size={24} strokeWidth={2.25} />
              </span>
            ) : (
              <Icon className="text-orange-300" size={32} strokeWidth={2} />
            )}
            <span className={cn("text-xs font-semibold capitalize", active === key ? "text-orange-900" : "text-orange-300")}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案H: 波紋リップル（タップで水面のように広がる）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardH() {
  const [active, setActive] = useState<Section>("lab");
  const [ripples, setRipples] = useState<{ key: number; section: Section }[]>([]);
  const counter = useRef(0);

  const handleSelect = (key: Section) => {
    setActive(key);
    const id = counter.current++;
    setRipples(r => [...r, { key: id, section: key }]);
    setTimeout(() => setRipples(r => r.filter(x => x.key !== id)), 700);
  };

  return (
    <div className={cn(cardBase, "border-cyan-200 bg-white")}>
      <style>{`
        @keyframes h-ripple {
          0%   { transform: translate(-50%,-50%) scale(0); opacity: 0.6; }
          100% { transform: translate(-50%,-50%) scale(4.5); opacity: 0; }
        }
        .h-ripple { animation: h-ripple 0.65s ease-out forwards; }
      `}</style>
      <div className={cn(headerBase, "bg-cyan-100 border-cyan-200 text-cyan-900")}>案H｜波紋リップル</div>
      <div className={cn(bodyBase, "bg-cyan-50 divide-x divide-cyan-200")}>
        {sections.map(({ key, label, Icon }) => (
          <button key={key} type="button"
            className={cn("relative flex flex-1 flex-col items-center justify-center gap-2 overflow-hidden py-5 transition-colors", active === key && "bg-cyan-100")}
            onClick={() => handleSelect(key)}
          >
            {/* リップルエフェクト */}
            {ripples.filter(r => r.section === key).map(r => (
              <span key={r.key} className="h-ripple pointer-events-none absolute left-1/2 top-1/2 h-12 w-12 rounded-full bg-cyan-400" />
            ))}
            {active === key ? (
              <span className="relative z-10 inline-flex items-center justify-center rounded-full border-2 border-cyan-500 bg-cyan-500 p-2">
                <Icon className="text-white" size={24} strokeWidth={2.25} />
              </span>
            ) : (
              <Icon className="relative z-10 text-cyan-300" size={32} strokeWidth={2} />
            )}
            <span className={cn("relative z-10 text-xs font-semibold capitalize", active === key ? "text-cyan-900" : "text-cyan-300")}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案I: ネオングロー（選択中が光り続ける）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardI() {
  const [active, setActive] = useState<Section>("lab");

  return (
    <div className={cn(cardBase, "border-purple-300 bg-slate-900")}>
      <style>{`
        @keyframes i-glow {
          0%, 100% { box-shadow: 0 0 6px 2px #a855f7, 0 0 18px 4px #7c3aed55; }
          50%       { box-shadow: 0 0 14px 5px #a855f7, 0 0 36px 10px #7c3aed88; }
        }
        .i-glow { animation: i-glow 1.6s ease-in-out infinite; }
        @keyframes i-pop {
          0%   { transform: scale(0.5); opacity:0; }
          70%  { transform: scale(1.15); }
          100% { transform: scale(1); opacity:1; }
        }
        .i-pop { animation: i-pop 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards; }
      `}</style>
      <div className={cn(headerBase, "bg-slate-800 border-purple-800 text-purple-300")}>案I｜ネオングロー</div>
      <div className={cn(bodyBase, "bg-slate-800 divide-x divide-slate-700")}>
        {sections.map(({ key, label, Icon }) => (
          <button key={key} type="button"
            className="flex flex-1 flex-col items-center justify-center gap-2 py-5 transition-colors hover:bg-slate-700/50"
            onClick={() => setActive(key)}
          >
            {active === key ? (
              <span key={`${key}-${active}`} className="i-pop i-glow inline-flex items-center justify-center rounded-full border-2 border-purple-400 bg-purple-600 p-2">
                <Icon className="text-white" size={24} strokeWidth={2.25} />
              </span>
            ) : (
              <Icon className="text-slate-600" size={32} strokeWidth={2} />
            )}
            <span className={cn("text-xs font-semibold capitalize", active === key ? "text-purple-300" : "text-slate-600")}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案J: 3Dフリップ（Y軸回転でアイコン切り替え）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardJ() {
  const [active, setActive] = useState<Section>("lab");
  const [flipping, setFlipping] = useState<Section | null>(null);

  const handleSelect = (key: Section) => {
    if (key === active || flipping) return;
    setFlipping(key);
    setTimeout(() => { setActive(key); setFlipping(null); }, 320);
  };

  return (
    <div className={cn(cardBase, "border-indigo-200 bg-white")}>
      <style>{`
        @keyframes j-flip-out {
          0%   { transform: perspective(200px) rotateY(0deg); }
          100% { transform: perspective(200px) rotateY(90deg); opacity:0; }
        }
        @keyframes j-flip-in {
          0%   { transform: perspective(200px) rotateY(-90deg); opacity:0; }
          100% { transform: perspective(200px) rotateY(0deg); opacity:1; }
        }
        .j-flip-out { animation: j-flip-out 0.18s ease-in forwards; }
        .j-flip-in  { animation: j-flip-in  0.18s ease-out 0.18s forwards; }
      `}</style>
      <div className={cn(headerBase, "bg-indigo-100 border-indigo-200 text-indigo-900")}>案J｜3Dフリップ</div>
      <div className={cn(bodyBase, "bg-indigo-50 divide-x divide-indigo-200")}>
        {sections.map(({ key, label, Icon }) => (
          <button key={key} type="button"
            className={cn("flex flex-1 flex-col items-center justify-center gap-2 py-5 transition-colors", active === key && !flipping && "bg-indigo-100")}
            onClick={() => handleSelect(key)}
          >
            {active === key && flipping === null ? (
              <span className="inline-flex items-center justify-center rounded-full border-2 border-indigo-500 bg-indigo-500 p-2">
                <Icon className="text-white" size={24} strokeWidth={2.25} />
              </span>
            ) : active === key && flipping !== null ? (
              <span className="j-flip-out inline-flex items-center justify-center rounded-full border-2 border-indigo-500 bg-indigo-500 p-2">
                <Icon className="text-white" size={24} strokeWidth={2.25} />
              </span>
            ) : flipping === key ? (
              <span className="j-flip-in inline-flex items-center justify-center rounded-full border-2 border-indigo-500 bg-indigo-500 p-2" style={{opacity:0}}>
                <Icon className="text-white" size={24} strokeWidth={2.25} />
              </span>
            ) : (
              <Icon className="text-indigo-300" size={32} strokeWidth={2} />
            )}
            <span className={cn("text-xs font-semibold capitalize", active === key ? "text-indigo-900" : "text-indigo-300")}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案K: パーティクル爆発（分裂して再集合）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardK() {
  const [active, setActive] = useState<Section>("lab");
  const [bursting, setBursting] = useState<Section | null>(null);
  const [animKey, setAnimKey] = useState(0);

  const handleSelect = (key: Section) => {
    if (key === active) return;
    setBursting(active);
    setTimeout(() => { setActive(key); setBursting(null); setAnimKey(n => n + 1); }, 260);
  };

  const particles = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <div className={cn(cardBase, "border-pink-200 bg-white")}>
      <style>{`
        @keyframes k-particle {
          0%   { transform: translate(-50%,-50%) scale(1); opacity:1; }
          100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(0); opacity:0; }
        }
        .k-particle { animation: k-particle 0.28s ease-out forwards; }
        @keyframes k-assemble {
          0%   { transform: scale(0) rotate(-180deg); opacity:0; }
          60%  { transform: scale(1.2) rotate(10deg); opacity:1; }
          100% { transform: scale(1) rotate(0deg); }
        }
        .k-assemble { animation: k-assemble 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards; }
      `}</style>
      <div className={cn(headerBase, "bg-pink-100 border-pink-200 text-pink-900")}>案K｜パーティクル爆発</div>
      <div className={cn(bodyBase, "bg-pink-50 divide-x divide-pink-200")}>
        {sections.map(({ key, label, Icon }) => (
          <button key={key} type="button"
            className={cn("relative flex flex-1 flex-col items-center justify-center gap-2 py-5 overflow-hidden transition-colors", active === key && "bg-pink-100")}
            onClick={() => handleSelect(key)}
          >
            {bursting === key ? (
              <span className="relative inline-flex items-center justify-center">
                {particles.map((deg) => {
                  const rad = (deg * Math.PI) / 180;
                  const dx = Math.round(Math.cos(rad) * 28);
                  const dy = Math.round(Math.sin(rad) * 28);
                  return (
                    <span key={deg} className="k-particle absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-pink-500"
                      style={{ "--dx": `${dx}px`, "--dy": `${dy}px` } as React.CSSProperties} />
                  );
                })}
                <span className="invisible p-2"><Icon size={24} /></span>
              </span>
            ) : active === key ? (
              <span key={`assemble-${animKey}`} className="k-assemble inline-flex items-center justify-center rounded-full border-2 border-pink-500 bg-pink-500 p-2">
                <Icon className="text-white" size={24} strokeWidth={2.25} />
              </span>
            ) : (
              <Icon className="text-pink-300" size={32} strokeWidth={2} />
            )}
            <span className={cn("text-xs font-semibold capitalize", active === key ? "text-pink-900" : "text-pink-300")}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案L: 磁石（非選択アイコンが選択中に引き寄せられる）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardL() {
  const [active, setActive] = useState<Section>("lab");

  return (
    <div className={cn(cardBase, "border-lime-200 bg-white")}>
      <div className={cn(headerBase, "bg-lime-100 border-lime-200 text-lime-900")}>案L｜磁石引き寄せ</div>
      <div className={cn(bodyBase, "bg-lime-50 divide-x divide-lime-200")}>
        {sections.map(({ key, label, Icon }, i) => {
          const activeIdx = sectionIndex[active];
          const myIdx = i;
          const diff = activeIdx - myIdx; // 正: 右方向に引き寄せ、負: 左
          const pull = active === key ? 0 : Math.sign(diff) * Math.min(Math.abs(diff) * 6, 10);
          return (
            <button key={key} type="button"
              className={cn("flex flex-1 flex-col items-center justify-center gap-2 py-5 transition-all duration-300", active === key && "bg-lime-100")}
              onClick={() => setActive(key)}
            >
              <span style={{ transform: `translateX(${pull}px)`, transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
                {active === key ? (
                  <span className="inline-flex items-center justify-center rounded-full border-2 border-lime-500 bg-lime-500 p-2">
                    <Icon className="text-white" size={24} strokeWidth={2.25} />
                  </span>
                ) : (
                  <Icon className="text-lime-400" size={32} strokeWidth={2} />
                )}
              </span>
              <span className={cn("text-xs font-semibold capitalize", active === key ? "text-lime-900" : "text-lime-400")}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案M: ポータル（縮んで消えて拡大して出現）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardM() {
  const [active, setActive] = useState<Section>("lab");
  const [next, setNext] = useState<Section | null>(null);
  const [animKey, setAnimKey] = useState(0);

  const handleSelect = (key: Section) => {
    if (key === active || next) return;
    setNext(key);
    setAnimKey(k => k + 1);
    setTimeout(() => { setActive(key); setNext(null); }, 280);
  };

  return (
    <div className={cn(cardBase, "border-fuchsia-200 bg-white")}>
      <style>{`
        @keyframes m-portal-out {
          0%   { transform: scale(1) rotate(0deg); opacity:1; filter: blur(0); }
          100% { transform: scale(0) rotate(180deg); opacity:0; filter: blur(4px); }
        }
        @keyframes m-portal-in {
          0%   { transform: scale(0) rotate(-180deg); opacity:0; filter: blur(4px); }
          100% { transform: scale(1) rotate(0deg); opacity:1; filter: blur(0); }
        }
        .m-portal-out { animation: m-portal-out 0.25s ease-in forwards; }
        .m-portal-in  { animation: m-portal-in  0.25s ease-out 0.2s both; }
      `}</style>
      <div className={cn(headerBase, "bg-fuchsia-100 border-fuchsia-200 text-fuchsia-900")}>案M｜ポータル</div>
      <div className={cn(bodyBase, "bg-fuchsia-50 divide-x divide-fuchsia-200")}>
        {sections.map(({ key, label, Icon }) => (
          <button key={key} type="button"
            className={cn("flex flex-1 flex-col items-center justify-center gap-2 py-5 transition-colors", (active === key && !next) && "bg-fuchsia-100")}
            onClick={() => handleSelect(key)}
          >
            {active === key && next === null ? (
              <span className="inline-flex items-center justify-center rounded-full border-2 border-fuchsia-500 bg-fuchsia-500 p-2">
                <Icon className="text-white" size={24} strokeWidth={2.25} />
              </span>
            ) : active === key && next !== null ? (
              <span key={`out-${animKey}`} className="m-portal-out inline-flex items-center justify-center rounded-full border-2 border-fuchsia-500 bg-fuchsia-500 p-2">
                <Icon className="text-white" size={24} strokeWidth={2.25} />
              </span>
            ) : next === key ? (
              <span key={`in-${animKey}`} className="m-portal-in inline-flex items-center justify-center rounded-full border-2 border-fuchsia-500 bg-fuchsia-500 p-2" style={{opacity:0}}>
                <Icon className="text-white" size={24} strokeWidth={2.25} />
              </span>
            ) : (
              <Icon className="text-fuchsia-300" size={32} strokeWidth={2} />
            )}
            <span className={cn("text-xs font-semibold capitalize", (active === key && !next) ? "text-fuchsia-900" : "text-fuchsia-300")}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案N: ゼリー（超弾性バネ、行き過ぎて戻る）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardN() {
  const [active, setActive] = useState<Section>("lab");
  const [animKey, setAnimKey] = useState(0);
  const [prev, setPrev] = useState<Section | null>(null);

  const handleSelect = (key: Section) => {
    if (key === active) return;
    setPrev(active);
    setActive(key);
    setAnimKey(k => k + 1);
  };

  return (
    <div className={cn(cardBase, "border-yellow-200 bg-white")}>
      <style>{`
        @keyframes n-jelly {
          0%   { transform: scale(0.4,1.6); }
          20%  { transform: scale(1.3,0.7); }
          40%  { transform: scale(0.85,1.15); }
          60%  { transform: scale(1.08,0.93); }
          80%  { transform: scale(0.97,1.03); }
          100% { transform: scale(1,1); }
        }
        .n-jelly { animation: n-jelly 0.55s cubic-bezier(0.36,0.07,0.19,0.97) forwards; }
        @keyframes n-squish-out {
          0%   { transform: scale(1); opacity:1; }
          100% { transform: scale(2,0.1); opacity:0; }
        }
        .n-squish-out { animation: n-squish-out 0.18s ease-in forwards; }
      `}</style>
      <div className={cn(headerBase, "bg-yellow-100 border-yellow-200 text-yellow-900")}>案N｜ゼリー弾性</div>
      <div className={cn(bodyBase, "bg-yellow-50 divide-x divide-yellow-200")}>
        {sections.map(({ key, label, Icon }) => (
          <button key={key} type="button"
            className={cn("flex flex-1 flex-col items-center justify-center gap-2 py-5 transition-colors", active === key && "bg-yellow-100")}
            onClick={() => handleSelect(key)}
          >
            {active === key ? (
              <span key={`in-${animKey}`} className="n-jelly inline-flex items-center justify-center rounded-full border-2 border-yellow-500 bg-yellow-500 p-2">
                <Icon className="text-white" size={24} strokeWidth={2.25} />
              </span>
            ) : prev === key ? (
              <span key={`out-${animKey}`} className="n-squish-out inline-flex items-center justify-center rounded-full border-2 border-yellow-500 bg-yellow-500 p-2">
                <Icon className="text-white" size={24} strokeWidth={2.25} />
              </span>
            ) : (
              <Icon className="text-yellow-300" size={32} strokeWidth={2} />
            )}
            <span className={cn("text-xs font-semibold capitalize", active === key ? "text-yellow-900" : "text-yellow-300")}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案O: 振り子スイング
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardO() {
  const [active, setActive] = useState<Section>("lab");
  const [ballKey, setBallKey] = useState(0);
  const idx = sectionIndex[active];
  const handleClick = (s: Section) => { if (s !== active) { setActive(s); setBallKey(k => k + 1); } };
  return (
    <div className={cn(cardBase, "border-purple-200 bg-white")}>
      <style>{`
        @keyframes o-arc { 0%{transform:translateY(0)} 40%{transform:translateY(-18px)} 70%{transform:translateY(-5px)} 100%{transform:translateY(0)} }
        .o-arc { animation: o-arc 500ms ease-out forwards; }
      `}</style>
      <div className={cn(headerBase, "bg-purple-100 border-purple-200 text-purple-900")}>案O｜振り子スイング</div>
      <div className={cn(bodyBase, "relative bg-purple-50")} style={{ minHeight: 84 }}>
        <div
          key={ballKey}
          className="o-arc absolute pointer-events-none"
          style={{
            bottom: 10,
            width: 32, height: 32,
            borderRadius: "50%",
            background: "rgba(168,85,247,0.55)",
            left: `calc(${idx * 33.333}% + 16.666% - 16px)`,
            transition: "left 500ms cubic-bezier(0.36,0,0.66,-0.45)",
          }}
        />
        {sections.map(({ key, label, Icon }) => (
          <button key={key} type="button" className="relative z-10 flex flex-1 flex-col items-center justify-center gap-2 py-5" onClick={() => handleClick(key)}>
            <Icon className={cn("transition-colors duration-300", active === key ? "text-purple-700" : "text-purple-300")} size={28} strokeWidth={2} />
            <span className={cn("text-xs font-semibold capitalize transition-colors duration-300", active === key ? "text-purple-900" : "text-purple-300")}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案P: ピンポン跳ね返り
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardP() {
  const [active, setActive] = useState<Section>("lab");
  const idx = sectionIndex[active];
  return (
    <div className={cn(cardBase, "border-orange-200 bg-white")}>
      <style>{`
        @keyframes p-bounce { 0%,100%{transform:translateY(0)} 30%{transform:translateY(-22px)} 60%{transform:translateY(-8px)} 80%{transform:translateY(-14px)} }
        .p-bounce { animation: p-bounce 0.7s ease-out; }
      `}</style>
      <div className={cn(headerBase, "bg-orange-100 border-orange-200 text-orange-900")}>案P｜ピンポン跳ね返り</div>
      <div className={cn(bodyBase, "relative bg-orange-50")} style={{ minHeight: 84 }}>
        <div
          key={`${active}`}
          className="p-bounce absolute pointer-events-none"
          style={{
            bottom: 8,
            width: 28, height: 28,
            borderRadius: "50%",
            background: "rgba(249,115,22,0.65)",
            left: `calc(${idx * 33.333}% + 16.666% - 14px)`,
            transition: "left 280ms cubic-bezier(0.4,0,0.2,1)",
          }}
        />
        {sections.map(({ key, label, Icon }) => (
          <button key={key} type="button" className="relative z-10 flex flex-1 flex-col items-center justify-center gap-2 py-5" onClick={() => setActive(key)}>
            <Icon className={cn("transition-colors duration-300", active === key ? "text-orange-600" : "text-orange-300")} size={28} strokeWidth={2} />
            <span className={cn("text-xs font-semibold capitalize transition-colors duration-300", active === key ? "text-orange-900" : "text-orange-300")}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案Q: 水滴落下＋着水
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardQ() {
  const [active, setActive] = useState<Section>("lab");
  const [dropKey, setDropKey] = useState(0);
  const [dropIdx, setDropIdx] = useState(0);
  const idx = sectionIndex[active];

  const handleClick = (s: Section) => {
    if (s === active) return;
    setDropIdx(sectionIndex[s]);
    setActive(s);
    setDropKey(k => k + 1);
  };

  return (
    <div className={cn(cardBase, "border-cyan-200 bg-white")}>
      <style>{`
        @keyframes q-drop { 0%{transform:translateY(-40px) scaleY(1.4);opacity:0} 60%{transform:translateY(0) scaleY(0.7);opacity:1} 80%{transform:translateY(-6px) scaleY(1.1);opacity:1} 100%{transform:translateY(0) scaleY(1);opacity:0} }
        @keyframes q-ripple { 0%{transform:scale(0.3);opacity:0.8} 100%{transform:scale(2.5);opacity:0} }
        .q-drop { animation: q-drop 0.55s ease-out forwards; }
        .q-ripple { animation: q-ripple 0.5s ease-out 0.3s forwards; opacity:0; }
        .q-ripple2 { animation: q-ripple 0.5s ease-out 0.45s forwards; opacity:0; }
      `}</style>
      <div className={cn(headerBase, "bg-cyan-100 border-cyan-200 text-cyan-900")}>案Q｜水滴落下＋着水</div>
      <div className={cn(bodyBase, "relative bg-cyan-50")} style={{ minHeight: 84 }}>
        {dropKey > 0 && (
          <div
            key={dropKey}
            className="absolute pointer-events-none"
            style={{ left: `calc(${dropIdx * 33.333}% + 16.666% - 14px)`, top: 0, width: 28, zIndex: 20 }}
          >
            <div className="q-drop mx-auto" style={{ width: 20, height: 24, borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%", background: "rgba(6,182,212,0.7)" }} />
            <div className="q-ripple" style={{ position: "absolute", bottom: 2, left: "50%", marginLeft: -16, width: 32, height: 32, borderRadius: "50%", border: "2px solid rgba(6,182,212,0.6)" }} />
            <div className="q-ripple2" style={{ position: "absolute", bottom: 2, left: "50%", marginLeft: -16, width: 32, height: 32, borderRadius: "50%", border: "2px solid rgba(6,182,212,0.4)" }} />
          </div>
        )}
        {sections.map(({ key, label, Icon }) => (
          <button key={key} type="button" className="relative z-10 flex flex-1 flex-col items-center justify-center gap-2 py-5" onClick={() => handleClick(key)}>
            <span className={cn("inline-flex items-center justify-center rounded-full transition-all duration-300", active === key ? "border-2 border-cyan-400 bg-cyan-400 p-1.5" : "")}>
              <Icon className={cn("transition-colors duration-300", active === key ? "text-white" : "text-cyan-300")} size={active === key ? 22 : 28} strokeWidth={2} />
            </span>
            <span className={cn("text-xs font-semibold capitalize transition-colors duration-300", active === key ? "text-cyan-900" : "text-cyan-300")}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案R: 慣性スライド（オーバーシュート）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardR() {
  const [active, setActive] = useState<Section>("lab");
  const idx = sectionIndex[active];
  return (
    <div className={cn(cardBase, "border-rose-200 bg-white")}>
      <div className={cn(headerBase, "bg-rose-100 border-rose-200 text-rose-900")}>案R｜慣性オーバーシュート</div>
      <div className={cn(bodyBase, "relative bg-rose-50")} style={{ minHeight: 84 }}>
        <div
          className="absolute inset-y-0 w-1/3 bg-rose-200 pointer-events-none"
          style={{ transform: `translateX(${idx * 100}%)`, transition: "transform 600ms cubic-bezier(0.175,0.885,0.32,1.7)" }}
        />
        {sections.map(({ key, label, Icon }) => (
          <button key={key} type="button" className="relative z-10 flex flex-1 flex-col items-center justify-center gap-2 py-5" onClick={() => setActive(key)}>
            <Icon className={cn("transition-colors duration-300", active === key ? "text-rose-700" : "text-rose-300")} size={28} strokeWidth={2} />
            <span className={cn("text-xs font-semibold capitalize transition-colors duration-300", active === key ? "text-rose-900" : "text-rose-300")}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案S: 長押し確定（プログレスリング）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardS() {
  const [active, setActive] = useState<Section>("lab");
  const [pressing, setPressing] = useState<Section | null>(null);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);
  const HOLD_MS = 800;

  const startPress = (s: Section) => {
    if (s === active) return;
    setPressing(s);
    setProgress(0);
    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - startRef.current) / HOLD_MS);
      setProgress(p);
      if (p >= 1) {
        clearInterval(timerRef.current!);
        setActive(s);
        setPressing(null);
        setProgress(0);
      }
    }, 16);
  };

  const cancelPress = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPressing(null);
    setProgress(0);
  };

  const R = 14;
  const circ = 2 * Math.PI * R;

  return (
    <div className={cn(cardBase, "border-green-200 bg-white")}>
      <div className={cn(headerBase, "bg-green-100 border-green-200 text-green-900")}>案S｜長押し確定</div>
      <div className={cn(bodyBase, "bg-green-50 divide-x divide-green-200")}>
        {sections.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            className={cn("flex flex-1 flex-col items-center justify-center gap-2 py-5 select-none", active === key && "bg-green-100")}
            onPointerDown={() => startPress(key)}
            onPointerUp={cancelPress}
            onPointerLeave={cancelPress}
          >
            <span className="relative inline-flex items-center justify-center">
              {(pressing === key || active === key) && (
                <svg className="absolute" width={36} height={36} style={{ top: "50%", left: "50%", transform: "translate(-50%,-50%) rotate(-90deg)" }}>
                  <circle cx={18} cy={18} r={R} fill="none" stroke={active === key ? "rgb(34,197,94)" : "rgb(34,197,94)"} strokeWidth={2.5}
                    strokeDasharray={circ}
                    strokeDashoffset={circ * (1 - (pressing === key ? progress : 1))}
                    style={{ transition: pressing === key ? "none" : undefined }}
                  />
                </svg>
              )}
              <Icon className={cn("transition-colors duration-300", active === key ? "text-green-600" : "text-green-300")} size={28} strokeWidth={2} />
            </span>
            <span className={cn("text-xs font-semibold capitalize transition-colors duration-300", active === key ? "text-green-900" : "text-green-300")}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案T: ホバープレビュー→クリック確定
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardT() {
  const [active, setActive] = useState<Section>("lab");
  const [hovered, setHovered] = useState<Section | null>(null);
  const [confirmKey, setConfirmKey] = useState(0);

  const handleClick = (s: Section) => {
    setActive(s);
    setConfirmKey(k => k + 1);
  };

  const preview = hovered ?? active;
  const idx = sectionIndex[preview];

  return (
    <div className={cn(cardBase, "border-indigo-200 bg-white")}>
      <style>{`
        @keyframes t-confirm { 0%{transform:scale(1);opacity:1} 50%{transform:scale(1.3);opacity:0.6} 100%{transform:scale(1);opacity:1} }
        .t-confirm { animation: t-confirm 0.3s ease-out; }
      `}</style>
      <div className={cn(headerBase, "bg-indigo-100 border-indigo-200 text-indigo-900")}>案T｜ホバープレビュー</div>
      <div className={cn(bodyBase, "relative bg-indigo-50")} style={{ minHeight: 84 }}>
        <div
          className="absolute inset-y-0 w-1/3 pointer-events-none"
          style={{
            transform: `translateX(${idx * 100}%)`,
            transition: "transform 200ms ease-out",
            background: hovered && hovered !== active
              ? "rgba(99,102,241,0.12)"
              : "rgba(99,102,241,0.22)",
            borderBottom: `3px solid ${hovered && hovered !== active ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.8)"}`,
          }}
        />
        {sections.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            className="relative z-10 flex flex-1 flex-col items-center justify-center gap-2 py-5"
            onMouseEnter={() => setHovered(key)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => handleClick(key)}
          >
            <span key={active === key ? `a-${confirmKey}` : key} className={active === key ? "t-confirm" : ""}>
              <Icon className={cn("transition-colors duration-200", active === key ? "text-indigo-700" : hovered === key ? "text-indigo-500" : "text-indigo-300")} size={28} strokeWidth={2} />
            </span>
            <span className={cn("text-xs font-semibold capitalize transition-colors duration-200", active === key ? "text-indigo-900" : hovered === key ? "text-indigo-600" : "text-indigo-300")}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案U: ダブルタップ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardU() {
  const [active, setActive] = useState<Section>("lab");
  const [pulse, setPulse] = useState<Section | null>(null);
  const [confirmKey, setConfirmKey] = useState(0);
  const lastTap = useRef<{ section: Section; time: number } | null>(null);

  const handleTap = (s: Section) => {
    const now = Date.now();
    if (lastTap.current && lastTap.current.section === s && now - lastTap.current.time < 350) {
      setActive(s);
      setConfirmKey(k => k + 1);
      lastTap.current = null;
    } else {
      lastTap.current = { section: s, time: now };
      setPulse(s);
      setTimeout(() => setPulse(null), 400);
    }
  };

  return (
    <div className={cn(cardBase, "border-pink-200 bg-white")}>
      <style>{`
        @keyframes u-pulse { 0%{box-shadow:0 0 0 0 rgba(236,72,153,0.5)} 100%{box-shadow:0 0 0 16px rgba(236,72,153,0)} }
        @keyframes u-confirm { 0%{transform:scale(1)} 30%{transform:scale(1.4)} 60%{transform:scale(0.9)} 100%{transform:scale(1)} }
        .u-pulse { animation: u-pulse 0.4s ease-out forwards; }
        .u-confirm { animation: u-confirm 0.35s ease-out forwards; }
      `}</style>
      <div className={cn(headerBase, "bg-pink-100 border-pink-200 text-pink-900")}>案U｜ダブルタップ確定</div>
      <div className={cn(bodyBase, "bg-pink-50 divide-x divide-pink-200")}>
        {sections.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            className={cn("flex flex-1 flex-col items-center justify-center gap-2 py-5", active === key && "bg-pink-100")}
            onClick={() => handleTap(key)}
          >
            <span
              key={active === key ? `a-${confirmKey}` : pulse === key ? `p-${key}` : key}
              className={cn(
                "inline-flex items-center justify-center rounded-full",
                active === key ? "u-confirm border-2 border-pink-500 bg-pink-500 p-1.5" : pulse === key ? "u-pulse border-2 border-pink-300 p-1.5" : ""
              )}
            >
              <Icon className={cn("transition-colors duration-200", active === key ? "text-white" : pulse === key ? "text-pink-400" : "text-pink-300")} size={active === key ? 22 : 28} strokeWidth={2} />
            </span>
            <span className={cn("text-xs font-semibold capitalize", active === key ? "text-pink-900" : "text-pink-300")}>{label}</span>
            <span className="text-[9px] text-pink-400">{active === key ? "✓" : "2× tap"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案V: スワイプ距離で速度変化
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardV() {
  const [active, setActive] = useState<Section>("lab");
  const [dragX, setDragX] = useState<number | null>(null);
  const [duration, setDuration] = useState(300);
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startIdx = useRef(0);
  const startTime = useRef(0);

  const idx = sectionIndex[active];

  const pillLeft = dragX !== null
    ? `${Math.max(0, Math.min(2, dragX)) * 33.333}%`
    : `${idx * 33.333}%`;

  const onPointerDown = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    containerRef.current.setPointerCapture(e.pointerId);
    startX.current = e.clientX;
    startIdx.current = idx;
    startTime.current = Date.now();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!containerRef.current || e.buttons === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width * 3;
    setDragX(startIdx.current + (rel - startIdx.current - 0.5));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragX === null) return;
    const dist = Math.abs(e.clientX - startX.current);
    const elapsed = Date.now() - startTime.current;
    const velocity = dist / Math.max(elapsed, 1);
    const newDuration = Math.max(80, Math.min(600, Math.round(300 / (velocity * 2 + 1))));
    setDuration(newDuration);
    const newIdx = Math.max(0, Math.min(2, Math.round(dragX)));
    setActive(sections[newIdx].key);
    setDragX(null);
  };

  return (
    <div className={cn(cardBase, "border-teal-200 bg-white")}>
      <div className={cn(headerBase, "bg-teal-100 border-teal-200 text-teal-900")}>案V｜スワイプ速度変化</div>
      <div
        ref={containerRef}
        className={cn(bodyBase, "relative bg-teal-50 cursor-grab active:cursor-grabbing touch-none")}
        style={{ minHeight: 84 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div
          className="absolute inset-y-0 w-1/3 bg-teal-200 pointer-events-none"
          style={{ left: pillLeft, transition: dragX !== null ? "none" : `left ${duration}ms cubic-bezier(0.4,0,0.2,1)` }}
        />
        <div className="absolute bottom-1 right-2 text-[9px] text-teal-400 pointer-events-none">{duration}ms</div>
        {sections.map(({ key, label, Icon }) => {
          const sIdx = sectionIndex[key];
          const isActive = dragX !== null ? Math.round(Math.max(0, Math.min(2, dragX))) === sIdx : active === key;
          return (
            <div key={key} className="relative z-10 flex flex-1 flex-col items-center justify-center gap-2 py-5 pointer-events-none">
              <Icon className={cn("transition-colors duration-300", isActive ? "text-teal-700" : "text-teal-300")} size={28} strokeWidth={2} />
              <span className={cn("text-xs font-semibold capitalize transition-colors duration-300", isActive ? "text-teal-900" : "text-teal-300")}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案W: グリッチ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardW() {
  const [active, setActive] = useState<Section>("lab");
  const [glitching, setGlitching] = useState(false);
  const [glitchKey, setGlitchKey] = useState(0);
  const idx = sectionIndex[active];

  const handleClick = (s: Section) => {
    if (s === active) return;
    setGlitching(true);
    setGlitchKey(k => k + 1);
    setTimeout(() => { setActive(s); setGlitching(false); }, 180);
  };

  return (
    <div className={cn(cardBase, "border-slate-600 bg-slate-900")}>
      <style>{`
        @keyframes w-glitch1 { 0%{clip-path:inset(20% 0 60% 0);transform:translate(-4px,0)} 20%{clip-path:inset(50% 0 20% 0);transform:translate(4px,0)} 40%{clip-path:inset(10% 0 70% 0);transform:translate(-2px,0)} 60%{clip-path:inset(70% 0 10% 0);transform:translate(3px,0)} 80%{clip-path:inset(30% 0 50% 0);transform:translate(-3px,0)} 100%{clip-path:inset(0 0 0 0);transform:translate(0,0)} }
        @keyframes w-glitch2 { 0%{clip-path:inset(60% 0 20% 0);transform:translate(4px,0);opacity:0.5} 30%{clip-path:inset(20% 0 60% 0);transform:translate(-3px,0)} 60%{clip-path:inset(40% 0 30% 0);transform:translate(2px,0)} 100%{clip-path:inset(0 0 0 0);transform:translate(0,0);opacity:0} }
        .w-glitch1 { animation: w-glitch1 0.18s steps(1) forwards; }
        .w-glitch2 { animation: w-glitch2 0.18s steps(1) forwards; }
      `}</style>
      <div className={cn(headerBase, "bg-slate-800 border-slate-600 text-cyan-400")}>案W｜グリッチ</div>
      <div className={cn(bodyBase, "relative bg-slate-800")} style={{ minHeight: 84 }}>
        {/* Active highlight */}
        <div className="absolute inset-y-0 w-1/3 pointer-events-none" style={{ left: `${idx * 33.333}%`, background: "rgba(34,211,238,0.08)", borderBottom: "2px solid rgba(34,211,238,0.5)", transition: "left 100ms" }} />
        {/* Glitch overlay */}
        {glitching && (
          <>
            <div key={`g1-${glitchKey}`} className="w-glitch1 absolute inset-0 pointer-events-none" style={{ background: "rgba(34,211,238,0.15)" }} />
            <div key={`g2-${glitchKey}`} className="w-glitch2 absolute inset-0 pointer-events-none" style={{ background: "rgba(255,0,100,0.12)" }} />
          </>
        )}
        {sections.map(({ key, label, Icon }) => (
          <button key={key} type="button" className="relative z-10 flex flex-1 flex-col items-center justify-center gap-2 py-5" onClick={() => handleClick(key)}>
            <Icon className={cn("transition-colors duration-150", active === key ? "text-cyan-400" : "text-slate-500")} size={28} strokeWidth={2} />
            <span className={cn("text-xs font-semibold capitalize", active === key ? "text-cyan-400" : "text-slate-500")}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案X: ホログラム投影
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardX() {
  const [active, setActive] = useState<Section>("lab");
  const [colKey, setColKey] = useState(0);
  const idx = sectionIndex[active];

  const handleClick = (s: Section) => { setActive(s); setColKey(k => k + 1); };

  return (
    <div className={cn(cardBase, "border-blue-900 bg-slate-950")}>
      <style>{`
        @keyframes x-rise { 0%{transform:scaleY(0);opacity:0} 60%{transform:scaleY(1.08);opacity:0.9} 100%{transform:scaleY(1);opacity:1} }
        @keyframes x-glow { 0%,100%{box-shadow:0 0 8px 2px rgba(59,130,246,0.5)} 50%{box-shadow:0 0 18px 6px rgba(59,130,246,0.8)} }
        .x-rise { animation: x-rise 0.4s ease-out forwards; transform-origin: bottom; }
        .x-glow { animation: x-glow 2s ease-in-out infinite; }
      `}</style>
      <div className={cn(headerBase, "bg-slate-900 border-blue-900 text-blue-400")}>案X｜ホログラム投影</div>
      <div className={cn(bodyBase, "relative bg-slate-950")} style={{ minHeight: 84 }}>
        {/* Rising column */}
        <div
          key={colKey}
          className="x-rise x-glow absolute bottom-0 w-1/3 pointer-events-none"
          style={{
            left: `${idx * 33.333}%`,
            height: "70%",
            background: "linear-gradient(180deg, rgba(59,130,246,0.0) 0%, rgba(59,130,246,0.18) 100%)",
            borderTop: "1px solid rgba(59,130,246,0.6)",
          }}
        />
        {/* Scanline */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(59,130,246,0.03) 3px, rgba(59,130,246,0.03) 4px)" }} />
        {sections.map(({ key, label, Icon }) => (
          <button key={key} type="button" className="relative z-10 flex flex-1 flex-col items-center justify-center gap-2 py-5" onClick={() => handleClick(key)}>
            <Icon className={cn("transition-all duration-300", active === key ? "text-blue-400 drop-shadow-[0_0_6px_rgba(59,130,246,0.9)]" : "text-slate-600")} size={28} strokeWidth={2} />
            <span className={cn("text-xs font-semibold capitalize transition-colors duration-300", active === key ? "text-blue-400" : "text-slate-600")}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案Y: ピクセル溶解（Dissolve）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardY() {
  const [active, setActive] = useState<Section>("lab");
  const [prev, setPrev] = useState<Section | null>(null);
  const [animKey, setAnimKey] = useState(0);

  const handleClick = (s: Section) => {
    if (s === active) return;
    setPrev(active);
    setActive(s);
    setAnimKey(k => k + 1);
  };

  const dots = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className={cn(cardBase, "border-lime-200 bg-white")}>
      <style>{`
        @keyframes y-scatter { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(var(--dx),var(--dy)) scale(0);opacity:0} }
        @keyframes y-gather { 0%{transform:translate(var(--dx),var(--dy)) scale(0);opacity:0} 100%{transform:translate(0,0) scale(1);opacity:1} }
        .y-scatter { animation: y-scatter 0.35s ease-in forwards; }
        .y-gather { animation: y-gather 0.35s ease-out forwards; animation-delay: var(--del,0s); opacity:0; }
      `}</style>
      <div className={cn(headerBase, "bg-lime-100 border-lime-200 text-lime-900")}>案Y｜ピクセル溶解</div>
      <div className={cn(bodyBase, "bg-lime-50 divide-x divide-lime-200")}>
        {sections.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            className={cn("flex flex-1 flex-col items-center justify-center gap-2 py-5", active === key && "bg-lime-100")}
            onClick={() => handleClick(key)}
          >
            <span className="relative inline-flex items-center justify-center w-10 h-10">
              {active === key && (
                <span key={`in-${animKey}-${key}`} className="absolute inset-0 flex flex-wrap items-center justify-center gap-[2px]" style={{ padding: 2 }}>
                  {dots.map((i) => (
                    <span
                      key={i}
                      className="y-gather block rounded-sm bg-lime-500"
                      style={{
                        width: 5, height: 5,
                        "--dx": `${(Math.random() - 0.5) * 30}px`,
                        "--dy": `${(Math.random() - 0.5) * 30}px`,
                        "--del": `${i * 18}ms`,
                      } as React.CSSProperties}
                    />
                  ))}
                </span>
              )}
              {prev === key && (
                <span key={`out-${animKey}-${key}`} className="absolute inset-0 flex flex-wrap items-center justify-center gap-[2px]" style={{ padding: 2 }}>
                  {dots.map((i) => (
                    <span
                      key={i}
                      className="y-scatter block rounded-sm bg-lime-500"
                      style={{
                        width: 5, height: 5,
                        "--dx": `${(Math.random() - 0.5) * 30}px`,
                        "--dy": `${(Math.random() - 0.5) * 30}px`,
                      } as React.CSSProperties}
                    />
                  ))}
                </span>
              )}
              {active !== key && prev !== key && (
                <Icon className="text-lime-300" size={28} strokeWidth={2} />
              )}
              {active === key && <Icon className="text-lime-700 relative z-10 opacity-0" size={22} strokeWidth={2} />}
            </span>
            <span className={cn("text-xs font-semibold capitalize", active === key ? "text-lime-900" : "text-lime-300")}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案Z: 炎エフェクト
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardZ() {
  const [active, setActive] = useState<Section>("lab");
  return (
    <div className={cn(cardBase, "border-orange-300 bg-white")}>
      <style>{`
        @keyframes z-flame { 0%,100%{transform:scaleX(1) scaleY(1);border-radius:50% 50% 30% 30%;opacity:0.9} 25%{transform:scaleX(0.85) scaleY(1.15);border-radius:40% 60% 25% 35%;opacity:1} 50%{transform:scaleX(1.1) scaleY(0.95);border-radius:55% 45% 35% 25%;opacity:0.85} 75%{transform:scaleX(0.9) scaleY(1.1);border-radius:45% 55% 28% 32%;opacity:1} }
        .z-flame { animation: z-flame 0.7s ease-in-out infinite; }
        @keyframes z-inner { 0%,100%{transform:scaleX(1) scaleY(1)} 33%{transform:scaleX(0.8) scaleY(1.2)} 66%{transform:scaleX(1.1) scaleY(0.85)} }
        .z-inner { animation: z-inner 0.5s ease-in-out infinite; }
      `}</style>
      <div className={cn(headerBase, "bg-orange-100 border-orange-200 text-orange-900")}>案Z｜炎エフェクト</div>
      <div className={cn(bodyBase, "bg-orange-50 divide-x divide-orange-200")}>
        {sections.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            className={cn("flex flex-1 flex-col items-center justify-center gap-1 py-4", active === key && "bg-orange-100")}
            onClick={() => setActive(key)}
          >
            {active === key && (
              <span className="relative" style={{ height: 20, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                <span className="z-flame absolute" style={{ width: 20, height: 22, background: "linear-gradient(180deg,#fdba74,#f97316,#dc2626)", borderRadius: "50% 50% 30% 30%", bottom: 0 }} />
                <span className="z-inner absolute" style={{ width: 10, height: 12, background: "linear-gradient(180deg,#fef9c3,#fbbf24)", borderRadius: "50% 50% 30% 30%", bottom: 2 }} />
              </span>
            )}
            {!active || active !== key ? <div style={{ height: 20 }} /> : null}
            <Icon className={cn("transition-colors duration-300", active === key ? "text-orange-600" : "text-orange-300")} size={26} strokeWidth={2} />
            <span className={cn("text-xs font-semibold capitalize transition-colors duration-300", active === key ? "text-orange-900" : "text-orange-300")}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案AA: 信号機スタイル
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardAA() {
  const [active, setActive] = useState<Section>("lab");
  const [animKey, setAnimKey] = useState(0);
  const [sequence, setSequence] = useState<Section[]>([]);

  const handleClick = (s: Section) => {
    if (s === active) return;
    const order: Section[] = ["home", "class", "lab"];
    const seq: Section[] = [];
    let found = false;
    for (const step of [...order, ...order]) {
      if (found) { seq.push(step); if (step === s) break; }
      if (step === active) found = true;
    }
    setSequence(seq);
    setAnimKey(k => k + 1);
    let delay = 0;
    for (const step of seq) {
      delay += 250;
      setTimeout(() => setActive(step), delay);
    }
  };

  const lights: { key: Section; color: string; dimColor: string }[] = [
    { key: "home", color: "#ef4444", dimColor: "#7f1d1d" },
    { key: "class", color: "#eab308", dimColor: "#713f12" },
    { key: "lab", color: "#22c55e", dimColor: "#14532d" },
  ];

  return (
    <div className={cn(cardBase, "border-slate-600 bg-slate-900")}>
      <div className={cn(headerBase, "bg-slate-800 border-slate-600 text-slate-300")}>案AA｜信号機スタイル</div>
      <div className={cn(bodyBase, "bg-slate-900 divide-x divide-slate-700")}>
        {sections.map(({ key, label, Icon }) => {
          const light = lights.find(l => l.key === key)!;
          const isActive = active === key;
          return (
            <button
              key={key}
              type="button"
              className="flex flex-1 flex-col items-center justify-center gap-2 py-5"
              onClick={() => handleClick(key)}
            >
              <span
                className="inline-flex items-center justify-center rounded-full transition-all duration-200"
                style={{
                  width: 36, height: 36,
                  background: isActive ? light.color : light.dimColor,
                  boxShadow: isActive ? `0 0 14px 4px ${light.color}88` : "none",
                }}
              >
                <Icon className="text-white" size={18} strokeWidth={2.5} />
              </span>
              <span className={cn("text-xs font-semibold capitalize transition-colors duration-200", isActive ? "text-slate-100" : "text-slate-500")}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案BB: タイルめくり
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardBB() {
  const [active, setActive] = useState<Section>("lab");
  const [flipping, setFlipping] = useState<Section | null>(null);
  const [flipKey, setFlipKey] = useState(0);

  const handleClick = (s: Section) => {
    if (s === active || flipping) return;
    setFlipping(s);
    setFlipKey(k => k + 1);
    setTimeout(() => { setActive(s); setFlipping(null); }, 350);
  };

  return (
    <div className={cn(cardBase, "border-violet-200 bg-white")}>
      <style>{`
        @keyframes bb-flip-in { 0%{transform:perspective(200px) rotateX(-90deg);opacity:0} 100%{transform:perspective(200px) rotateX(0deg);opacity:1} }
        @keyframes bb-flip-out { 0%{transform:perspective(200px) rotateX(0deg);opacity:1} 100%{transform:perspective(200px) rotateX(90deg);opacity:0} }
        .bb-flip-in { animation: bb-flip-in 0.35s ease-out forwards; transform-origin: top; }
        .bb-flip-out { animation: bb-flip-out 0.35s ease-in forwards; transform-origin: bottom; }
      `}</style>
      <div className={cn(headerBase, "bg-violet-100 border-violet-200 text-violet-900")}>案BB｜タイルめくり</div>
      <div className={cn(bodyBase, "bg-violet-50 divide-x divide-violet-200")}>
        {sections.map(({ key, label, Icon }) => {
          const isActive = active === key;
          const isFlipping = flipping === key;
          return (
            <button
              key={key}
              type="button"
              className="flex flex-1 flex-col items-center justify-center gap-2 py-5 overflow-hidden"
              onClick={() => handleClick(key)}
            >
              <span
                key={`${key}-${flipKey}-${isActive}`}
                className={cn(
                  "inline-flex items-center justify-center rounded-lg",
                  isFlipping ? "bb-flip-in" : isActive ? "bb-flip-in" : "",
                  isActive ? "border-2 border-violet-500 bg-violet-500 p-2" : ""
                )}
              >
                <Icon className={cn("transition-colors duration-150", isActive ? "text-white" : "text-violet-300")} size={isActive ? 22 : 28} strokeWidth={2} />
              </span>
              <span className={cn("text-xs font-semibold capitalize", isActive ? "text-violet-900" : "text-violet-300")}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案CC: レーダースキャン
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardCC() {
  const [active, setActive] = useState<Section>("lab");
  return (
    <div className={cn(cardBase, "border-green-800 bg-slate-950")}>
      <style>{`
        @keyframes cc-scan { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        .cc-scan { animation: cc-scan 2s linear infinite; transform-origin: left center; }
        @keyframes cc-ping { 0%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(2.5)} }
        .cc-ping { animation: cc-ping 1s ease-out infinite; }
      `}</style>
      <div className={cn(headerBase, "bg-slate-900 border-green-800 text-green-400")}>案CC｜レーダースキャン</div>
      <div className={cn(bodyBase, "relative bg-slate-950")} style={{ minHeight: 84, overflow: "hidden" }}>
        {/* Radar beam */}
        <div className="absolute inset-0 pointer-events-none flex items-center" style={{ zIndex: 5 }}>
          <div
            className="cc-scan"
            style={{
              width: "50%",
              height: 2,
              background: "linear-gradient(90deg, rgba(34,197,94,0.8) 0%, rgba(34,197,94,0) 100%)",
              transformOrigin: "left center",
            }}
          />
        </div>
        {/* Grid lines */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(34,197,94,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.1) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        {sections.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            className="relative z-10 flex flex-1 flex-col items-center justify-center gap-2 py-5"
            onClick={() => setActive(key)}
          >
            <span className="relative inline-flex items-center justify-center">
              {active === key && (
                <span className="cc-ping absolute inset-0 rounded-full border border-green-400" />
              )}
              <Icon className={cn("transition-all duration-300", active === key ? "text-green-400 drop-shadow-[0_0_6px_rgba(34,197,94,0.9)]" : "text-green-900")} size={28} strokeWidth={2} />
            </span>
            <span className={cn("text-xs font-semibold capitalize transition-colors duration-300", active === key ? "text-green-400" : "text-green-900")}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案DD: イコライザーバー
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardDD() {
  const [active, setActive] = useState<Section>("lab");

  const barHeights = [60, 90, 45, 75, 55, 80, 40];

  return (
    <div className={cn(cardBase, "border-purple-200 bg-white")}>
      <style>{`
        @keyframes dd-bar { 0%,100%{transform:scaleY(var(--min-h))} 50%{transform:scaleY(1)} }
        .dd-bar { animation: dd-bar var(--dur,0.6s) ease-in-out infinite; animation-delay: var(--del,0s); transform-origin: bottom; }
      `}</style>
      <div className={cn(headerBase, "bg-purple-100 border-purple-200 text-purple-900")}>案DD｜イコライザーバー</div>
      <div className={cn(bodyBase, "bg-purple-50 divide-x divide-purple-200")}>
        {sections.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            className={cn("flex flex-1 flex-col items-center justify-center gap-2 py-4", active === key && "bg-purple-100")}
            onClick={() => setActive(key)}
          >
            {active === key ? (
              <span className="flex items-end gap-[2px]" style={{ height: 32 }}>
                {barHeights.map((h, i) => (
                  <span
                    key={i}
                    className="dd-bar block rounded-sm bg-purple-500"
                    style={{
                      width: 3,
                      height: `${h}%`,
                      maxHeight: 28,
                      "--min-h": `${(barHeights[i] * 0.2) / 100}`,
                      "--dur": `${0.4 + i * 0.07}s`,
                      "--del": `${i * 60}ms`,
                    } as React.CSSProperties}
                  />
                ))}
              </span>
            ) : (
              <Icon className="text-purple-300" size={28} strokeWidth={2} />
            )}
            <span className={cn("text-xs font-semibold capitalize", active === key ? "text-purple-900" : "text-purple-300")}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案EE: モールス信号点滅
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const morsePatterns: Record<Section, string> = {
  lab:   ".-.. .- -.",    // L A B
  class: "-.-. .-.. .- ... ...",  // C L A S S
  home:  ".... --- -- .",  // H O M E
};

function buildMorseKeyframes(section: Section): string {
  const pattern = morsePatterns[section];
  const dotDur = 120;
  const dashDur = 360;
  const gapSymbol = 80;
  const gapLetter = 240;
  let totalMs = 0;
  const steps: { on: boolean; start: number; end: number }[] = [];

  for (const ch of pattern) {
    if (ch === ".") {
      steps.push({ on: true, start: totalMs, end: totalMs + dotDur });
      totalMs += dotDur + gapSymbol;
    } else if (ch === "-") {
      steps.push({ on: true, start: totalMs, end: totalMs + dashDur });
      totalMs += dashDur + gapSymbol;
    } else if (ch === " ") {
      totalMs += gapLetter - gapSymbol;
    }
  }
  totalMs += 600; // pause at end

  const pcts: string[] = [];
  pcts.push(`0%{opacity:0}`);
  for (const s of steps) {
    const p1 = ((s.start / totalMs) * 100).toFixed(1);
    const p2 = (((s.start + 1) / totalMs) * 100).toFixed(1);
    const p3 = (((s.end - 1) / totalMs) * 100).toFixed(1);
    const p4 = ((s.end / totalMs) * 100).toFixed(1);
    pcts.push(`${p1}%{opacity:0}`, `${p2}%{opacity:1}`, `${p3}%{opacity:1}`, `${p4}%{opacity:0}`);
  }
  pcts.push(`100%{opacity:0}`);

  return `@keyframes ee-morse-${section} { ${pcts.join(" ")} }`;
}

function CardEE() {
  const [active, setActive] = useState<Section>("lab");
  const totalDurMs: Record<Section, number> = { lab: 2000, class: 3200, home: 2400 };
  return (
    <div className={cn(cardBase, "border-yellow-600 bg-slate-950")}>
      <style>{`
        ${buildMorseKeyframes("lab")}
        ${buildMorseKeyframes("class")}
        ${buildMorseKeyframes("home")}
      `}</style>
      <div className={cn(headerBase, "bg-slate-900 border-yellow-600 text-yellow-400")}>案EE｜モールス信号</div>
      <div className={cn(bodyBase, "bg-slate-950 divide-x divide-slate-700")}>
        {sections.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            className="flex flex-1 flex-col items-center justify-center gap-2 py-5"
            onClick={() => setActive(key)}
          >
            <span className="relative inline-flex items-center justify-center">
              {active === key && (
                <span
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: "rgba(234,179,8,0.35)",
                    animation: `ee-morse-${key} ${totalDurMs[key]}ms steps(1) infinite`,
                  }}
                />
              )}
              <Icon
                className={cn("transition-colors duration-300", active === key ? "text-yellow-400" : "text-slate-600")}
                size={28}
                strokeWidth={2}
                style={active === key ? { filter: `drop-shadow(0 0 6px rgba(234,179,8,0.9))`, animation: `ee-morse-${key} ${totalDurMs[key]}ms steps(1) infinite` } : undefined}
              />
            </span>
            <span className={cn("text-xs font-semibold capitalize transition-colors duration-300", active === key ? "text-yellow-400" : "text-slate-600")}>{label}</span>
            <span className="text-[9px] font-mono" style={{ color: active === key ? "rgba(234,179,8,0.6)" : "rgba(255,255,255,0.1)" }}>
              {morsePatterns[key].replaceAll(" ", "·")}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 長押し共通フック
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function useLongPress(onConfirm: (s: Section) => void, holdMs = 800) {
  const [pressing, setPressing] = useState<Section | null>(null);
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTime = useRef(0);

  const start = (s: Section) => {
    setPressing(s);
    setProgress(0);
    startTime.current = Date.now();
    timer.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - startTime.current) / holdMs);
      setProgress(p);
      if (p >= 1) {
        clearInterval(timer.current!);
        onConfirm(s);
        setPressing(null);
        setProgress(0);
      }
    }, 16);
  };

  const cancel = () => {
    if (timer.current) clearInterval(timer.current);
    setPressing(null);
    setProgress(0);
  };

  return { pressing, progress, start, cancel };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案FF: 横バー（ボトムフィル）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardFF() {
  const [active, setActive] = useState<Section>("lab");
  const { pressing, progress, start, cancel } = useLongPress((s) => setActive(s));

  return (
    <div className={cn(cardBase, "border-indigo-200 bg-white")}>
      <div className={cn(headerBase, "bg-indigo-100 border-indigo-200 text-indigo-900")}>案FF｜横バーフィル</div>
      <div className={cn(bodyBase, "bg-indigo-50 divide-x divide-indigo-100")}>
        {sections.map(({ key, label, Icon }) => {
          const isActive = active === key;
          const isPressing = pressing === key;
          return (
            <button
              key={key}
              type="button"
              className={cn("relative flex flex-1 flex-col items-center justify-center gap-2 py-5 overflow-hidden select-none", isActive && "bg-indigo-100")}
              onPointerDown={() => start(key)}
              onPointerUp={cancel}
              onPointerLeave={cancel}
            >
              {/* Fill bar at bottom */}
              {isPressing && (
                <div
                  className="absolute bottom-0 left-0 h-1 bg-indigo-500 rounded-full"
                  style={{ width: `${progress * 100}%`, transition: "none" }}
                />
              )}
              {isActive && !isPressing && (
                <div className="absolute bottom-0 left-0 h-1 w-full bg-indigo-400 rounded-full" />
              )}
              <Icon className={cn("transition-colors duration-200", isActive ? "text-indigo-600" : "text-indigo-400")} size={28} strokeWidth={2} />
              <span className={cn("text-xs font-semibold capitalize", isActive ? "text-indigo-900" : "text-indigo-400")}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案GG: 背景塗りつぶし（下から上）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardGG() {
  const [active, setActive] = useState<Section>("lab");
  const { pressing, progress, start, cancel } = useLongPress((s) => setActive(s));

  const getFillPct = (key: Section) => {
    if (pressing && pressing !== active) {
      // 長押し中: 新しい方が増える、古い方が減る
      if (key === pressing) return progress * 100;
      if (key === active)   return (1 - progress) * 100;
      return 0;
    }
    return key === active ? 100 : 0;
  };

  const getTransition = (key: Section) => {
    if (pressing && pressing !== active) return "none"; // リアルタイム追従
    if (key === active) return "none";
    return "height 250ms ease-out"; // 離したときに戻るアニメ
  };

  return (
    <div className={cn(cardBase, "border-teal-200 bg-white")}>
      <div className={cn(headerBase, "bg-teal-100 border-teal-200 text-teal-900")}>案GG｜背景塗りつぶし</div>
      <div className={cn(bodyBase, "bg-teal-50 divide-x divide-teal-100")}>
        {sections.map(({ key, label, Icon }) => {
          const isActive = key === active;
          const fillPct = getFillPct(key);
          const isLit = fillPct > 50;
          return (
            <button
              key={key}
              type="button"
              className="relative flex flex-1 flex-col items-center justify-center gap-2 py-5 overflow-hidden select-none"
              onPointerDown={() => start(key)}
              onPointerUp={cancel}
              onPointerLeave={cancel}
            >
              <div
                className="absolute bottom-0 left-0 right-0 bg-teal-200"
                style={{ height: `${fillPct}%`, transition: getTransition(key) }}
              />
              <Icon
                className={cn("relative z-10 transition-colors duration-150", isLit ? "text-teal-700" : "text-teal-400")}
                size={28}
                strokeWidth={2}
              />
              <span className={cn("relative z-10 text-xs font-semibold capitalize transition-colors duration-150", isLit ? "text-teal-900" : "text-teal-400")}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案HH: 扇形（パイ）SVG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function PieProgress({ progress, size = 32, color = "#6366f1" }: { progress: number; size?: number; color?: string }) {
  const r = size / 2;
  const angle = progress * 360;
  const rad = (angle - 90) * (Math.PI / 180);
  const x = r + r * Math.cos(rad);
  const y = r + r * Math.sin(rad);
  const large = angle > 180 ? 1 : 0;
  const d = progress >= 1
    ? `M ${r} ${r} m 0 -${r} a ${r} ${r} 0 1 1 -0.001 0 Z`
    : `M ${r} ${r} L ${r} 0 A ${r} ${r} 0 ${large} 1 ${x} ${y} Z`;
  return (
    <svg width={size} height={size} style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}>
      <path d={d} fill={color} opacity={0.3} />
    </svg>
  );
}

function CardHH() {
  const [active, setActive] = useState<Section>("lab");
  const { pressing, progress, start, cancel } = useLongPress((s) => setActive(s));

  return (
    <div className={cn(cardBase, "border-violet-200 bg-white")}>
      <div className={cn(headerBase, "bg-violet-100 border-violet-200 text-violet-900")}>案HH｜パイ（扇形）</div>
      <div className={cn(bodyBase, "bg-violet-50 divide-x divide-violet-100")}>
        {sections.map(({ key, label, Icon }) => {
          const isActive = active === key;
          const isPressing = pressing === key;
          return (
            <button
              key={key}
              type="button"
              className={cn("relative flex flex-1 flex-col items-center justify-center gap-2 py-5 select-none", isActive && "bg-violet-100")}
              onPointerDown={() => start(key)}
              onPointerUp={cancel}
              onPointerLeave={cancel}
            >
              <span className="relative inline-flex items-center justify-center" style={{ width: 44, height: 44 }}>
                {isPressing && <PieProgress progress={progress} size={44} color="#7c3aed" />}
                {isActive && !isPressing && <PieProgress progress={1} size={44} color="#7c3aed" />}
                <Icon className={cn("relative z-10 transition-colors duration-200", isActive ? "text-violet-700" : "text-violet-400")} size={26} strokeWidth={2} />
              </span>
              <span className={cn("text-xs font-semibold capitalize", isActive ? "text-violet-900" : "text-violet-400")}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案II: カウントダウン数字
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardII() {
  const [active, setActive] = useState<Section>("lab");
  const { pressing, progress, start, cancel } = useLongPress((s) => setActive(s), 900);

  const getCount = (p: number) => {
    if (p <= 0) return null;
    if (p < 0.34) return "3";
    if (p < 0.67) return "2";
    return "1";
  };

  return (
    <div className={cn(cardBase, "border-amber-200 bg-white")}>
      <style>{`
        @keyframes ii-pop { 0%{transform:scale(1.4);opacity:0} 100%{transform:scale(1);opacity:1} }
        .ii-pop { animation: ii-pop 0.15s ease-out forwards; }
      `}</style>
      <div className={cn(headerBase, "bg-amber-100 border-amber-200 text-amber-900")}>案II｜カウントダウン</div>
      <div className={cn(bodyBase, "bg-amber-50 divide-x divide-amber-100")}>
        {sections.map(({ key, label, Icon }) => {
          const isActive = active === key;
          const isPressing = pressing === key;
          const count = isPressing ? getCount(progress) : null;
          return (
            <button
              key={key}
              type="button"
              className={cn("relative flex flex-1 flex-col items-center justify-center gap-2 py-5 select-none", isActive && "bg-amber-100")}
              onPointerDown={() => start(key)}
              onPointerUp={cancel}
              onPointerLeave={cancel}
            >
              <span className="relative inline-flex items-center justify-center" style={{ width: 40, height: 40 }}>
                {count !== null ? (
                  <span key={count} className="ii-pop absolute inset-0 flex items-center justify-center text-lg font-bold text-amber-600">
                    {count}
                  </span>
                ) : (
                  <Icon className={cn("transition-colors duration-200", isActive ? "text-amber-600" : "text-amber-400")} size={28} strokeWidth={2} />
                )}
              </span>
              <span className={cn("text-xs font-semibold capitalize", isActive ? "text-amber-900" : "text-amber-400")}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案JJ: 連続波紋パルス
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardJJ() {
  const [active, setActive] = useState<Section>("lab");
  const { pressing, progress, start, cancel } = useLongPress((s) => setActive(s));

  return (
    <div className={cn(cardBase, "border-rose-200 bg-white")}>
      <style>{`
        @keyframes jj-ripple { 0%{transform:scale(0.5);opacity:0.7} 100%{transform:scale(2.2);opacity:0} }
        .jj-r1 { animation: jj-ripple 0.8s ease-out infinite; }
        .jj-r2 { animation: jj-ripple 0.8s ease-out 0.27s infinite; }
        .jj-r3 { animation: jj-ripple 0.8s ease-out 0.54s infinite; }
      `}</style>
      <div className={cn(headerBase, "bg-rose-100 border-rose-200 text-rose-900")}>案JJ｜連続波紋</div>
      <div className={cn(bodyBase, "bg-rose-50 divide-x divide-rose-100")}>
        {sections.map(({ key, label, Icon }) => {
          const isActive = active === key;
          const isPressing = pressing === key;
          return (
            <button
              key={key}
              type="button"
              className={cn("relative flex flex-1 flex-col items-center justify-center gap-2 py-5 select-none", isActive && "bg-rose-100")}
              onPointerDown={() => start(key)}
              onPointerUp={cancel}
              onPointerLeave={cancel}
            >
              <span className="relative inline-flex items-center justify-center" style={{ width: 44, height: 44 }}>
                {isPressing && (
                  <>
                    <span className="jj-r1 absolute inset-0 rounded-full border-2 border-rose-400" />
                    <span className="jj-r2 absolute inset-0 rounded-full border-2 border-rose-400" />
                    <span className="jj-r3 absolute inset-0 rounded-full border-2 border-rose-400" />
                  </>
                )}
                {isActive && !isPressing && (
                  <span className="absolute inset-0 rounded-full border-2 border-rose-400 bg-rose-100" />
                )}
                <Icon className={cn("relative z-10 transition-colors duration-200", isActive ? "text-rose-600" : "text-rose-400")} size={isActive ? 22 : 28} strokeWidth={2} />
              </span>
              <span className={cn("text-xs font-semibold capitalize", isActive ? "text-rose-900" : "text-rose-400")}>{label}</span>
              {isPressing && (
                <span className="text-[9px] text-rose-500">{Math.round(progress * 100)}%</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案KK: スケールアップ確定
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardKK() {
  const [active, setActive] = useState<Section>("lab");
  const [confirmKey, setConfirmKey] = useState(0);
  const { pressing, progress, start, cancel } = useLongPress((s) => { setActive(s); setConfirmKey(k => k + 1); });

  return (
    <div className={cn(cardBase, "border-emerald-200 bg-white")}>
      <style>{`
        @keyframes kk-confirm { 0%{transform:scale(1.5);opacity:0} 50%{transform:scale(0.85)} 100%{transform:scale(1);opacity:1} }
        .kk-confirm { animation: kk-confirm 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
      `}</style>
      <div className={cn(headerBase, "bg-emerald-100 border-emerald-200 text-emerald-900")}>案KK｜スケール確定</div>
      <div className={cn(bodyBase, "bg-emerald-50 divide-x divide-emerald-100")}>
        {sections.map(({ key, label, Icon }) => {
          const isActive = active === key;
          const isPressing = pressing === key;
          const scale = isPressing ? 1 + progress * 0.45 : 1;
          return (
            <button
              key={key}
              type="button"
              className={cn("relative flex flex-1 flex-col items-center justify-center gap-2 py-5 select-none", isActive && "bg-emerald-100")}
              onPointerDown={() => start(key)}
              onPointerUp={cancel}
              onPointerLeave={cancel}
            >
              <span
                key={isActive && !isPressing ? `done-${confirmKey}` : key}
                className={cn("inline-flex items-center justify-center rounded-full transition-colors duration-200", isActive ? "kk-confirm border-2 border-emerald-500 bg-emerald-500 p-2" : "")}
                style={{
                  transform: isPressing ? `scale(${scale})` : undefined,
                  transition: isPressing ? "none" : undefined,
                  opacity: isPressing ? 0.5 + progress * 0.5 : 1,
                }}
              >
                <Icon className={cn(isActive ? "text-white" : "text-emerald-400")} size={isActive ? 22 : 28} strokeWidth={2} />
              </span>
              <span className={cn("text-xs font-semibold capitalize", isActive ? "text-emerald-900" : "text-emerald-400")}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案LL: 震えながらリング
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardLL() {
  const [active, setActive] = useState<Section>("lab");
  const { pressing, progress, start, cancel } = useLongPress((s) => setActive(s));
  const R = 15;
  const circ = 2 * Math.PI * R;
  const shakeAmp = pressing ? Math.sin(Date.now() / 60) * progress * 3 : 0;

  return (
    <div className={cn(cardBase, "border-orange-200 bg-white")}>
      <style>{`
        @keyframes ll-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-3px)} 75%{transform:translateX(3px)} }
        .ll-shake { animation: ll-shake 0.1s linear infinite; }
      `}</style>
      <div className={cn(headerBase, "bg-orange-100 border-orange-200 text-orange-900")}>案LL｜震えリング</div>
      <div className={cn(bodyBase, "bg-orange-50 divide-x divide-orange-100")}>
        {sections.map(({ key, label, Icon }) => {
          const isActive = active === key;
          const isPressing = pressing === key;
          return (
            <button
              key={key}
              type="button"
              className={cn("relative flex flex-1 flex-col items-center justify-center gap-2 py-5 select-none", isActive && "bg-orange-100")}
              onPointerDown={() => start(key)}
              onPointerUp={cancel}
              onPointerLeave={cancel}
            >
              <span className={cn("relative inline-flex items-center justify-center", isPressing && "ll-shake")} style={{ width: 44, height: 44 }}>
                <svg width={44} height={44} style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
                  {/* Track */}
                  <circle cx={22} cy={22} r={R} fill="none" stroke="rgba(249,115,22,0.2)" strokeWidth={3} />
                  {/* Progress */}
                  {(isPressing || isActive) && (
                    <circle
                      cx={22} cy={22} r={R}
                      fill="none"
                      stroke="rgb(249,115,22)"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeDasharray={circ}
                      strokeDashoffset={circ * (1 - (isPressing ? progress : 1))}
                      style={{ transition: isPressing ? "none" : undefined }}
                    />
                  )}
                </svg>
                <Icon className={cn("relative z-10 transition-colors duration-200", isActive ? "text-orange-600" : "text-orange-400")} size={22} strokeWidth={2} />
              </span>
              <span className={cn("text-xs font-semibold capitalize", isActive ? "text-orange-900" : "text-orange-400")}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案MM: アウトライン→ソリッド塗り替え
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CardMM() {
  const [active, setActive] = useState<Section>("lab");
  const { pressing, progress, start, cancel } = useLongPress((s) => setActive(s));

  return (
    <div className={cn(cardBase, "border-sky-200 bg-white")}>
      <div className={cn(headerBase, "bg-sky-100 border-sky-200 text-sky-900")}>案MM｜アウトライン→ソリッド</div>
      <div className={cn(bodyBase, "bg-sky-50 divide-x divide-sky-100")}>
        {sections.map(({ key, label, Icon }) => {
          const isActive = active === key;
          const isPressing = pressing === key;
          const p = isPressing ? progress : isActive ? 1 : 0;
          return (
            <button
              key={key}
              type="button"
              className="relative flex flex-1 flex-col items-center justify-center gap-2 py-5 select-none"
              onPointerDown={() => start(key)}
              onPointerUp={cancel}
              onPointerLeave={cancel}
            >
              <span
                className="inline-flex items-center justify-center rounded-full"
                style={{
                  width: 44,
                  height: 44,
                  border: `2.5px solid rgb(14,165,233)`,
                  background: `rgba(14,165,233,${p * 0.85})`,
                  transition: isPressing ? "none" : "background 250ms ease-out",
                }}
              >
                <Icon
                  style={{ color: p > 0.5 ? "white" : "rgb(14,165,233)", transition: isPressing ? "none" : "color 250ms" }}
                  size={22}
                  strokeWidth={2}
                />
              </span>
              <span className={cn("text-xs font-semibold capitalize transition-colors duration-200", isActive ? "text-sky-900" : "text-sky-400")}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ページ本体
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function AnimationDemoPage() {
  return (
    <div className="min-h-screen bg-[#eef2ec] p-6">
      <h1 className="mb-6 text-center text-lg font-bold text-slate-700">アニメーション比較</h1>

      <h2 className="mb-3 mt-2 text-sm font-bold text-slate-500 uppercase tracking-widest">通常クリック・スライド系</h2>
      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3 mb-8">
        <CardA />
        <CardB />
        <CardC />
        <CardD />
        <CardE />
        <CardF />
        <CardG />
        <CardH />
        <CardI />
        <CardJ />
        <CardK />
        <CardL />
        <CardM />
        <CardN />
        <CardO />
        <CardP />
        <CardQ />
        <CardR />
        <CardT />
        <CardU />
        <CardV />
        <CardW />
        <CardX />
        <CardY />
        <CardZ />
        <CardAA />
        <CardBB />
        <CardCC />
        <CardDD />
        <CardEE />
      </div>

      <h2 className="mb-3 text-sm font-bold text-slate-500 uppercase tracking-widest">長押し系</h2>
      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3">
        <CardS />
        <CardFF />
        <CardGG />
        <CardHH />
        <CardII />
        <CardJJ />
        <CardKK />
        <CardLL />
        <CardMM />
      </div>
    </div>
  );
}
