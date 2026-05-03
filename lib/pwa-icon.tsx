import { ImageResponse } from "next/og";

type PwaIconOptions = {
  size: number;
};

export function createPwaIconResponse({ size }: PwaIconOptions) {
  const cornerRadius = Math.round(size * 0.24);
  const iconSize = Math.round(size * 0.48);
  const subtitleSize = Math.max(18, Math.round(size * 0.08));
  const strokeWidth = Math.max(6, Math.round(size * 0.03));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #f6f1ea 0%, #eadfd0 100%)",
        }}
      >
        <div
          style={{
            width: "82%",
            height: "82%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: Math.round(size * 0.06),
            borderRadius: cornerRadius,
            padding: `${Math.round(size * 0.12)}px`,
            background: "linear-gradient(180deg, #7f1d1d 0%, #5f1616 100%)",
            color: "#fff7ed",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.16)",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              display: "flex",
              color: "#fff7ed",
              filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.18))",
            }}
          >
            <path d="M18 11c-1.5 0-2.5.5-3 2" />
            <path d="M4 6a2 2 0 0 0-2 2v4a5 5 0 0 0 5 5 8 8 0 0 1 5 2 8 8 0 0 1 5-2 5 5 0 0 0 5-5V8a2 2 0 0 0-2-2h-3a8 8 0 0 0-5 2 8 8 0 0 0-5-2z" />
            <path d="M6 11c1.5 0 2.5.5 3 2" />
          </svg>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: Math.round(size * 0.04),
              width: "78%",
            }}
          >
            <div
              style={{
                display: "flex",
                flex: 1,
                borderTop: `${strokeWidth}px solid rgba(255,247,237,0.24)`,
              }}
            />
            <span
              style={{
                display: "flex",
                color: "#fbbf24",
                fontSize: subtitleSize,
                fontWeight: 800,
                letterSpacing: "0.14em",
              }}
            >
              ANA
            </span>
            <div
              style={{
                display: "flex",
                flex: 1,
                borderTop: `${strokeWidth}px solid rgba(255,247,237,0.24)`,
              }}
            />
          </div>
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
    },
  );
}
