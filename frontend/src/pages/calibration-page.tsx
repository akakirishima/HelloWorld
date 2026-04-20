import { useCallback, useEffect, useRef, useState } from "react";

/* ── クッキー ── */
const COOKIE_KEY = "touch_matrix";
const saveCookie = (m: number[]) => {
  document.cookie = `${COOKIE_KEY}=${JSON.stringify(m)};path=/;max-age=${60 * 60 * 24 * 365}`;
};
const loadCookie = (): number[] | null => {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_KEY}=([^;]*)`));
  if (!match) return null;
  try {
    const v = JSON.parse(decodeURIComponent(match[1]));
    if (Array.isArray(v) && v.length === 9) return v;
  } catch { /* ignore */ }
  return null;
};

/* ── 行列演算 ── */
type Mat3 = [
  number, number, number,
  number, number, number,
  number, number, number,
];

const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

function matMul(A: Mat3, B: Mat3): Mat3 {
  const C: number[] = Array(9).fill(0);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      for (let k = 0; k < 3; k++)
        C[i * 3 + j] += A[i * 3 + k] * B[k * 3 + j];
  return C as Mat3;
}

// ガウス消去で 3x3 Ax=b を解く
function solve3(A: number[][], b: number[]): number[] {
  const aug = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < 3; col++) {
    let max = col;
    for (let r = col + 1; r < 3; r++)
      if (Math.abs(aug[r][col]) > Math.abs(aug[max][col])) max = r;
    [aug[col], aug[max]] = [aug[max], aug[col]];
    for (let r = col + 1; r < 3; r++) {
      const f = aug[r][col] / aug[col][col];
      for (let k = col; k <= 3; k++) aug[r][k] -= f * aug[col][k];
    }
  }
  const x = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    x[i] = aug[i][3];
    for (let j = i + 1; j < 3; j++) x[i] -= aug[i][j] * x[j];
    x[i] /= aug[i][i];
  }
  return x;
}

// 4点 src→dst から 2D アフィン行列（上2行）を最小二乗で求める
function solveAffine(src: [number, number][], dst: [number, number][]): Mat3 {
  const n = src.length;
  const AtA = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const Atbx = [0, 0, 0];
  const Atby = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const [x, y] = src[i];
    const [tx, ty] = dst[i];
    const row = [x, y, 1];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) AtA[r][c] += row[r] * row[c];
      Atbx[r] += row[r] * tx;
      Atby[r] += row[r] * ty;
    }
  }
  const [a, b, c] = solve3(AtA, Atbx);
  const [d, e, f] = solve3(AtA, Atby);
  return [a, b, c, d, e, f, 0, 0, 1];
}

/* ── プリセット ── */
const PRESETS: { label: string; desc: string; matrix: Mat3 }[] = [
  { label: "Left", desc: "左回転（標準）", matrix: [0, -1, 1, 1, 0, 0, 0, 0, 1] },
  { label: "Left+FlipH", desc: "左回転 + 水平反転", matrix: [0, 1, 0, 1, 0, 0, 0, 0, 1] },
  { label: "Left+FlipV", desc: "左回転 + 垂直反転", matrix: [0, -1, 1, -1, 0, 1, 0, 0, 1] },
  { label: "Right", desc: "右回転", matrix: [0, 1, 0, -1, 0, 1, 0, 0, 1] },
  { label: "Normal", desc: "回転なし", matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1] },
  { label: "Inverted", desc: "180° 反転", matrix: [-1, 0, 1, 0, -1, 1, 0, 0, 1] },
];

/* ── API ── */
async function applyMatrix(matrix: Mat3): Promise<void> {
  const res = await fetch("/api/calibration/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ matrix }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail ?? res.statusText);
  }
}

/* ── ターゲット定義（6×5グリッド、30点）── */
const MARGIN = 0.08;
const XS = [MARGIN, 0.3, 0.5, 0.7, 1 - MARGIN];
const YS = [MARGIN, 0.26, 0.42, 0.58, 0.74, 1 - MARGIN];
const TARGETS: [number, number][] = YS.flatMap((y) => XS.map((x): [number, number] => [x, y]));
const TARGET_LABELS = TARGETS.map((_, i) => `${i + 1}`);

type Phase = "idle" | "tapping" | "confirm" | "done";

/* ── Page ── */
export function CalibrationPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState(0);
  const [touches, setTouches] = useState<[number, number][]>([]);
  const [currentMatrix, setCurrentMatrix] = useState<Mat3>(() => loadCookie() ?? IDENTITY);
  const [pendingMatrix, setPendingMatrix] = useState<Mat3 | null>(null);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [liveTouch, setLiveTouch] = useState<{ x: number; y: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  /* ライブタッチ表示 */
  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) setLiveTouch({ x: t.clientX, y: t.clientY });
    };
    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) setLiveTouch({ x: t.clientX, y: t.clientY });
    };
    const onEnd = () => setLiveTouch(null);
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  /* オーバーレイのタップ処理 */
  const handleOverlayTouch = useCallback((e: React.TouchEvent) => {
    if (phase !== "tapping") return;
    e.preventDefault();
    const t = e.changedTouches[0];
    if (!t) return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const nx = t.clientX / W;
    const ny = t.clientY / H;
    const newTouches = [...touches, [nx, ny] as [number, number]];
    if (newTouches.length < 30) {
      setTouches(newTouches);
      setStep(newTouches.length);
    } else {
      // 30点揃ったので行列計算
      const correction = solveAffine(newTouches, TARGETS);
      const newMat = matMul(correction, currentMatrix);
      setPendingMatrix(newMat);
      setPhase("confirm");
    }
  }, [phase, touches, currentMatrix]);

  const startCalibration = () => {
    setTouches([]);
    setStep(0);
    setMessage(null);
    setPhase("tapping");
  };

  const handleApplyPreset = async (matrix: Mat3) => {
    setApplying(true);
    setMessage(null);
    try {
      await applyMatrix(matrix);
      saveCookie(matrix);
      setCurrentMatrix(matrix);
      setMessage({ type: "ok", text: "適用しました" });
    } catch (err) {
      setMessage({ type: "err", text: `エラー: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setApplying(false);
    }
  };

  const handleApplyPending = async () => {
    if (!pendingMatrix) return;
    setApplying(true);
    setMessage(null);
    try {
      await applyMatrix(pendingMatrix);
      saveCookie(pendingMatrix);
      setCurrentMatrix(pendingMatrix);
      setPendingMatrix(null);
      setPhase("done");
    } catch (err) {
      setMessage({ type: "err", text: `エラー: ${err instanceof Error ? err.message : String(err)}` });
      setPhase("idle");
    } finally {
      setApplying(false);
    }
  };

  /* ── タッピングオーバーレイ ── */
  if (phase === "tapping") {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const [tx, ty] = TARGETS[step];
    const cx = tx * W;
    const cy = ty * H;

    return (
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-slate-900 touch-none select-none"
        onTouchEnd={handleOverlayTouch}
      >
        {/* ライブタッチドット */}
        {liveTouch && (
          <div
            className="pointer-events-none absolute rounded-full border-2 border-indigo-400 bg-indigo-400/30"
            style={{ width: 48, height: 48, left: liveTouch.x - 24, top: liveTouch.y - 24 }}
          />
        )}

        {/* ターゲット × */}
        <div
          className="pointer-events-none absolute"
          style={{ left: cx - 28, top: cy - 28 }}
        >
          {/* 外枠リング */}
          <div className="absolute inset-0 rounded-full border-2 border-white/20" style={{ width: 56, height: 56 }} />
          {/* 十字 */}
          <div className="absolute bg-white" style={{ width: 2, height: 32, left: 27, top: 12 }} />
          <div className="absolute bg-white" style={{ width: 32, height: 2, left: 12, top: 27 }} />
          {/* 中心点 */}
          <div className="absolute rounded-full bg-amber-400" style={{ width: 6, height: 6, left: 25, top: 25 }} />
        </div>

        {/* 進捗 */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <p className="text-4xl font-bold text-white/20">{step + 1} / 30</p>
          <p className="mt-2 text-sm text-white/40">{TARGET_LABELS[step]}をタッチ</p>
        </div>

        {/* キャンセル */}
        <button
          type="button"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-6 py-2 text-sm text-white/60"
          onTouchEnd={(e) => { e.stopPropagation(); setPhase("idle"); }}
        >
          キャンセル
        </button>
      </div>
    );
  }

  /* ── 確認画面 ── */
  if (phase === "confirm" && pendingMatrix) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-sm">
          <h2 className="text-xl font-bold text-slate-800">計算完了</h2>
          <p className="mt-2 text-sm text-slate-500">4点のタッチから変換行列を計算しました。適用しますか？</p>
          <div className="mt-4 rounded-xl bg-slate-100 p-4 font-mono text-xs text-slate-600 break-all">
            [{pendingMatrix.map((v) => v.toFixed(4)).join(", ")}]
          </div>
          {message?.type === "err" && (
            <p className="mt-3 text-sm text-red-600">{message.text}</p>
          )}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              disabled={applying}
              onClick={handleApplyPending}
              className="flex-1 rounded-xl bg-indigo-500 py-3 font-semibold text-white disabled:opacity-50"
            >
              {applying ? "適用中…" : "適用する"}
            </button>
            <button
              type="button"
              onClick={() => setPhase("idle")}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-600"
            >
              やり直す
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── 完了画面 ── */
  if (phase === "done") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <span className="text-3xl">✓</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800">キャリブレーション完了</h2>
          <p className="mt-2 text-sm text-slate-500">設定はクッキーと xorg.conf.d に保存されました。</p>
          <button
            type="button"
            onClick={() => setPhase("idle")}
            className="mt-6 rounded-xl bg-indigo-500 px-6 py-3 font-semibold text-white"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  /* ── アイドル（メイン画面）── */
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      {liveTouch && (
        <div
          className="pointer-events-none fixed z-50 rounded-full border-2 border-indigo-400 bg-indigo-400/30"
          style={{ width: 48, height: 48, left: liveTouch.x - 24, top: liveTouch.y - 24 }}
        />
      )}

      <div className="mx-auto max-w-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">System</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">タッチキャリブレーション</h1>

        {message && (
          <div className={`mt-4 rounded-lg px-4 py-2 text-sm ${message.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {message.text}
          </div>
        )}

        {/* 4点キャリブレーション */}
        <div className="mt-6 rounded-2xl border-2 border-indigo-200 bg-white p-5">
          <h2 className="font-bold text-slate-800">4点キャリブレーション</h2>
          <p className="mt-1 text-sm text-slate-500">
            画面四隅の × を順番にタッチして、自動で行列を計算します。
          </p>
          <button
            type="button"
            onClick={startCalibration}
            className="mt-4 w-full rounded-xl bg-indigo-500 py-3 font-semibold text-white hover:bg-indigo-600 active:bg-indigo-700"
          >
            キャリブレーション開始
          </button>
        </div>

        {/* プリセット */}
        <div className="mt-6">
          <h2 className="font-semibold text-slate-700">プリセット（向きだけ直す）</h2>
          <div className="mt-3 grid grid-cols-1 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                disabled={applying}
                onClick={() => handleApplyPreset(p.matrix)}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50"
              >
                <div>
                  <p className="font-semibold text-slate-800">{p.label}</p>
                  <p className="text-xs text-slate-500">{p.desc}</p>
                </div>
                <span className="ml-4 rounded-lg bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                  適用
                </span>
              </button>
            ))}
          </div>
        </div>

        <p className="mt-6 text-xs text-slate-400">
          現在の行列: [{currentMatrix.map((v) => v.toFixed(2)).join(", ")}]
        </p>
      </div>
    </div>
  );
}
