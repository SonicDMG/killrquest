"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface Props {
  /** Current saved position (0–100 each axis) */
  offsetX: number;
  offsetY: number;
  /** Called with new percentages on drag end — debounced 600ms after last move */
  onCommit: (x: number, y: number) => void;
  /** Mirror image horizontally (monsters facing left) */
  flipX?: boolean;
  /** Extra overlay content rendered on top of the image */
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  imgSrc: string;
  imgAlt: string;
  /** Passed to the container div — used to intercept clicks from parent */
  onClick?: (e: React.MouseEvent) => void;
}

/** Clamp value between 0 and 100 */
function clamp(v: number) {
  return Math.max(0, Math.min(100, v));
}

export default function ImagePanContainer({
  offsetX,
  offsetY,
  onCommit,
  flipX = false,
  children,
  className = "",
  style,
  imgSrc,
  imgAlt,
  onClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: offsetX, y: offsetY });
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saved, setSaved] = useState(false);

  // Sync prop changes (e.g. different character selected)
  useEffect(() => {
    setPos({ x: offsetX, y: offsetY });
  }, [offsetX, offsetY]);

  const scheduleCommit = useCallback(
    (x: number, y: number) => {
      if (commitTimer.current) clearTimeout(commitTimer.current);
      commitTimer.current = setTimeout(() => {
        onCommit(x, y);
        setSaved(true);
        setTimeout(() => setSaved(false), 1200);
      }, 600);
    },
    [onCommit]
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(true);
      dragStart.current = { mx: e.clientX, my: e.clientY, ox: pos.x, oy: pos.y };
    },
    [pos]
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const t = e.touches[0];
      setDragging(true);
      dragStart.current = { mx: t.clientX, my: t.clientY, ox: pos.x, oy: pos.y };
    },
    [pos]
  );

  useEffect(() => {
    if (!dragging) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    const onMove = (mx: number, my: number) => {
      if (!dragStart.current) return;
      const ds = dragStart.current;
      const dx = ((mx - ds.mx) / rect.width) * 100;
      const dy = ((my - ds.my) / rect.height) * 100;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        movedRef.current = true;
      }
      const newX = clamp(ds.ox - dx);
      const newY = clamp(ds.oy - dy);
      setPos({ x: newX, y: newY });
      scheduleCommit(newX, newY);
    };

    const handleMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      onMove(t.clientX, t.clientY);
    };
    const stop = () => setDragging(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stop);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", stop);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", stop);
    };
  }, [dragging, scheduleCommit]);

  const objectPosition = `${pos.x}% ${pos.y}%`;

  // Track whether this interaction was a drag or a click
  const movedRef = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      movedRef.current = false;
      onMouseDown(e);
    },
    [onMouseDown]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (movedRef.current) {
        e.stopPropagation();
        return;
      }
      onClick?.(e);
    },
    [onClick]
  );

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={style}
      onMouseDown={handleMouseDown}
      onTouchStart={onTouchStart}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
    >
      {!imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgSrc}
          alt={imgAlt}
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover select-none"
          style={{
            objectPosition,
            transform: flipX ? "scaleX(-1)" : undefined,
            cursor: dragging ? "grabbing" : "grab",
            userSelect: "none",
          }}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-800">
          <span className="text-3xl">⚔️</span>
        </div>
      )}

      {/* Grip hint — shown on hover when not dragging */}
      {(hovered || dragging) && !imgError && (
        <div
          className="absolute inset-0 pointer-events-none flex items-center justify-center transition-opacity"
          style={{ opacity: dragging ? 0 : 0.6 }}
        >
          <div
            className="rounded-full p-1"
            style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
          >
            {/* 4-arrow move icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="5 9 2 12 5 15" />
              <polyline points="9 5 12 2 15 5" />
              <polyline points="15 19 12 22 9 19" />
              <polyline points="19 9 22 12 19 15" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="12" y1="2" x2="12" y2="22" />
            </svg>
          </div>
        </div>
      )}

      {/* Saved flash */}
      {saved && (
        <div
          className="absolute top-1 right-1 text-xs font-bold px-1.5 py-0.5 rounded pointer-events-none z-30"
          style={{ background: "rgba(22,163,74,0.85)", color: "#fff", fontFamily: "serif" }}
        >
          ✓
        </div>
      )}

      {/* Overlay children (badges, glows, tints) */}
      {children}
    </div>
  );
}
