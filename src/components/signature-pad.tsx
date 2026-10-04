"use client";

import { useEffect, useRef } from "react";

export function SignaturePad({ onChange }: { onChange: (value: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);
  const commitFrame = useRef(0);
  const sizeRef = useRef({ width: 320, height: 176 });

  function commit() {
    const canvas = canvasRef.current;
    if (!canvas || !hasInk.current) {
      onChange("");
      return;
    }
    onChange(canvas.toDataURL("image/png"));
  }

  function scheduleCommit() {
    if (commitFrame.current) return;
    commitFrame.current = window.requestAnimationFrame(() => {
      commitFrame.current = 0;
      commit();
    });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.parentElement?.clientWidth ?? 320;
    const height = 176;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = "#fffdf8";
    context.fillRect(0, 0, width, height);
    context.lineWidth = 3.2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#1c1915";
    contextRef.current = context;
    sizeRef.current = { width, height };
    return () => {
      if (commitFrame.current) window.cancelAnimationFrame(commitFrame.current);
    };
  }, []);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function mark(x: number, y: number) {
    const context = contextRef.current;
    if (!context) return;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + 0.01, y);
    context.stroke();
    hasInk.current = true;
    scheduleCommit();
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="signature-box"
        aria-label="Signature"
        onPointerDown={(event) => {
          const context = contextRef.current;
          if (!context) return;
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            // A pointer the browser will not capture can still leave ink.
          }
          drawing.current = true;
          const { x, y } = point(event);
          context.beginPath();
          context.moveTo(x, y);
          mark(x, y);
        }}
        onPointerMove={(event) => {
          if (!drawing.current) return;
          const context = contextRef.current;
          if (!context) return;
          const { x, y } = point(event);
          context.lineTo(x, y);
          context.stroke();
          hasInk.current = true;
          scheduleCommit();
        }}
        onPointerUp={() => {
          drawing.current = false;
          if (commitFrame.current) {
            window.cancelAnimationFrame(commitFrame.current);
            commitFrame.current = 0;
          }
          commit();
        }}
        onPointerCancel={() => {
          drawing.current = false;
          if (commitFrame.current) {
            window.cancelAnimationFrame(commitFrame.current);
            commitFrame.current = 0;
          }
          commit();
        }}
      />
      <button
        type="button"
        className="btn btn-secondary mt-3 w-full sm:w-auto"
        onClick={() => {
          const context = contextRef.current;
          if (!context) return;
          if (commitFrame.current) {
            window.cancelAnimationFrame(commitFrame.current);
            commitFrame.current = 0;
          }
          context.fillStyle = "#fffdf8";
          context.fillRect(0, 0, sizeRef.current.width, sizeRef.current.height);
          context.strokeStyle = "#1c1915";
          hasInk.current = false;
          onChange("");
        }}
      >
        Clear signature
      </button>
    </div>
  );
}
