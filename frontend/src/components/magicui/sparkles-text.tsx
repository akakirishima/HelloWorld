import { useMemo, type CSSProperties, type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface Sparkle {
  id: string;
  x: string;
  y: string;
  color: string;
  delay: number;
  scale: number;
  lifespan: number;
}

interface SparklesColors {
  first: string;
  second: string;
}

interface SparklesLayerProps {
  className?: string;
  sparklesCount?: number;
  colors?: SparklesColors;
  starSize?: number;
}

/**
 * 親要素の全域にキラキラ星を散らすオーバーレイ。
 * `position: absolute; inset: 0` 相当、親は `position: relative` にしておくこと。
 */
export function SparklesLayer({
  className,
  sparklesCount = 10,
  colors = { first: "#fde047", second: "#fbbf24" },
  starSize = 14,
}: SparklesLayerProps) {
  // 位置は一度決まったら固定。色/数が変わったときだけ再生成。
  const sparkles = useMemo(
    () => generateSparkles(sparklesCount, colors),
    [sparklesCount, colors],
  );

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      {sparkles.map((s) => (
        <SparkleDot key={s.id} sparkle={s} starSize={starSize} />
      ))}
    </div>
  );
}

interface SparklesTextProps {
  children: ReactNode;
  className?: string;
  sparklesCount?: number;
  colors?: SparklesColors;
  starSize?: number;
}

/** 子要素の周りだけを覆う版。名前だけキラキラさせたいときに使う。 */
export function SparklesText({
  children,
  className,
  sparklesCount = 10,
  colors = { first: "#fde047", second: "#fbbf24" },
  starSize = 14,
}: SparklesTextProps) {
  return (
    <span className={cn("relative inline-block", className)}>
      <SparklesLayer sparklesCount={sparklesCount} colors={colors} starSize={starSize} />
      <span className="relative z-10">{children}</span>
    </span>
  );
}

function generateSparkles(
  count: number,
  colors: SparklesColors,
): Sparkle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
    x: `${Math.random() * 100}%`,
    y: `${Math.random() * 100}%`,
    color: Math.random() < 0.5 ? colors.first : colors.second,
    delay: Math.random() * 3,
    scale: Math.random() * 0.6 + 0.6,
    lifespan: 3 + Math.random() * 1.5,
  }));
}

function SparkleDot({ sparkle, starSize }: { sparkle: Sparkle; starSize: number }) {
  const style = useMemo<CSSProperties>(
    () => ({
      position: "absolute",
      left: sparkle.x,
      top: sparkle.y,
      width: starSize,
      height: starSize,
      color: sparkle.color,
      transform: `translate(-50%, -50%) scale(${sparkle.scale})`,
      animation: `sparkle-pop ${sparkle.lifespan}s ease-in-out ${sparkle.delay}s infinite`,
      pointerEvents: "none",
    }),
    [sparkle, starSize],
  );
  return (
    <svg
      aria-hidden
      style={style}
      viewBox="0 0 68 68"
      fill="currentColor"
    >
      <path d="M26.5 25.5C19.0043 33.3697 0 34 0 34C0 34 19.1013 35.3684 26.5 43.5C33.234 50.901 34 68 34 68C34 68 36.9884 50.7065 44.5 43.5C51.6431 36.647 68 34 68 34C68 34 51.6947 32.0939 44.5 25.5C36.5605 18.2235 34 0 34 0C34 0 33.6591 17.9837 26.5 25.5Z" />
    </svg>
  );
}
