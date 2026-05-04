"use client";

import { useRef, useEffect, useState, useCallback } from "react";

export interface DiagramLabel {
    text: string;
    description?: string;
    anchorX: number;
    anchorY: number;
}

interface PlacedLabel {
    label: DiagramLabel;
    labelX: number;
    labelY: number;
    side: "left" | "right";
}

interface DiagramOverlayProps {
    imageUrl: string;
    labels: DiagramLabel[];
    alt?: string;
    className?: string;
}

const LABEL_MARGIN = 16;
const MIN_LABEL_GAP = 28;
const DOT_RADIUS = 3.5;
const DOT_HOVER_R = 5.5;
const LINE_ELBOW = 52;

function distributeLabels(
    items: DiagramLabel[],
    containerH: number,
    side: "left" | "right",
    containerW: number
): PlacedLabel[] {
    if (items.length === 0) return [];
    const sorted = [...items].sort((a, b) => a.anchorY - b.anchorY);
    const topPad = 32;
    const usable = containerH - topPad * 2;
    const ys: number[] = sorted.map((l) => topPad + l.anchorY * usable);
    for (let pass = 0; pass < 10; pass++) {
        for (let i = 1; i < ys.length; i++) {
            const prev = ys[i - 1] ?? 0;
            const curr = ys[i] ?? 0;
            if (curr - prev < MIN_LABEL_GAP) {
                const mid = (curr + prev) / 2;
                ys[i - 1] = mid - MIN_LABEL_GAP / 2;
                ys[i] = mid + MIN_LABEL_GAP / 2;
            }
        }
    }
    const labelX = side === "left" ? LABEL_MARGIN : containerW - LABEL_MARGIN;
    return sorted.map((label, i): PlacedLabel => ({
        label,
        labelX,
        labelY: ys[i] ?? topPad,
        side,
    }));
}

export function DiagramOverlay({
    imageUrl,
    labels,
    alt = "Diagrama técnico",
    className,
}: DiagramOverlayProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
    const [loaded, setLoaded] = useState(false);
    const [hovered, setHovered] = useState<string | null>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const handleLoad = useCallback(() => {
        setLoaded(true);
        setTimeout(() => setVisible(true), 80);
    }, []);

    const { w, h } = size;
    const placed: PlacedLabel[] = [
        ...distributeLabels(labels.filter((l) => l.anchorX < 0.5), h, "left", w),
        ...distributeLabels(labels.filter((l) => l.anchorX >= 0.5), h, "right", w),
    ];

    return (
        <div ref={containerRef} className={className} style={{ position: "relative", display: "block", lineHeight: 0 }}>
            <img
                src={imageUrl}
                alt={alt}
                style={{ display: "block", width: "100%", height: "auto", opacity: loaded ? 1 : 0, transition: "opacity 0.4s ease" }}
                onLoad={handleLoad}
            />
            {loaded && w > 0 && h > 0 && (
                <svg
                    aria-hidden="true"
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}
                    viewBox={`0 0 ${w} ${h}`}
                >
                    {placed.map(({ label, labelX, labelY, side }, idx) => {
                        const ax = label.anchorX * w;
                        const ay = label.anchorY * h;
                        const isLeft = side === "left";
                        const isHov = hovered === label.text;
                        const elbowX = isLeft ? labelX + LINE_ELBOW : labelX - LINE_ELBOW;
                        const textAnchor = isLeft ? "start" : "end";
                        const descWidth = Math.min((label.description?.length ?? 0) * 6, 220) + 10;
                        return (
                            <g
                                key={`label-${idx}`}
                                style={{ pointerEvents: "all", cursor: "default", opacity: visible ? 1 : 0, transition: `opacity 0.5s ease ${idx * 80}ms` }}
                                onMouseEnter={() => setHovered(label.text)}
                                onMouseLeave={() => setHovered(null)}
                            >
                                <circle cx={ax} cy={ay} r={isHov ? DOT_HOVER_R : DOT_RADIUS} fill={isHov ? "#ffffff" : "rgba(255,255,255,0.9)"} stroke="rgba(0,0,0,0.45)" strokeWidth="1" style={{ transition: "r 0.15s ease" }} />
                                <polyline points={`${ax},${ay} ${elbowX},${labelY} ${labelX},${labelY}`} fill="none" stroke={isHov ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.55)"} strokeWidth={isHov ? 1 : 0.75} strokeDasharray="4 3" style={{ transition: "stroke 0.15s ease" }} />
                                <text x={labelX} y={labelY + 4} textAnchor={textAnchor} fontSize="11.5" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif" fill="white" stroke="rgba(0,0,0,0.7)" strokeWidth="3.5" paintOrder="stroke" style={{ userSelect: "none" }}>{label.text}</text>
                                {isHov && label.description && (
                                    <>
                                        <rect x={isLeft ? labelX : labelX - descWidth} y={labelY + 10} width={descWidth} height={20} rx="4" fill="rgba(0,0,0,0.72)" />
                                        <text x={isLeft ? labelX + 5 : labelX - 5} y={labelY + 24} textAnchor={textAnchor} fontSize="9.5" fontFamily="system-ui, -apple-system, sans-serif" fill="rgba(255,255,255,0.88)" style={{ userSelect: "none" }}>{label.description}</text>
                                    </>
                                )}
                            </g>
                        );
                    })}
                </svg>
            )}
        </div>
    );
}