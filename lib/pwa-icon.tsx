import { ImageResponse } from "next/og";

type PwaIconOptions = {
  size: number;
};

export function createPwaIconResponse({ size }: PwaIconOptions) {
  const cornerRadius = Math.round(size * 0.24);
  const titleSize = Math.round(size * 0.34);
  const subtitleSize = Math.max(24, Math.round(size * 0.075));
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
            justifyContent: "space-between",
            borderRadius: cornerRadius,
            padding: `${Math.round(size * 0.14)}px ${Math.round(size * 0.12)}px`,
            background: "linear-gradient(180deg, #7f1d1d 0%, #5f1616 100%)",
            color: "#fff7ed",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.16)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                width: Math.round(size * 0.18),
                height: Math.round(size * 0.18),
                borderRadius: 999,
                background: "rgba(255,247,237,0.16)",
              }}
            />
            <div
              style={{
                display: "flex",
                width: Math.round(size * 0.08),
                height: Math.round(size * 0.08),
                borderRadius: 999,
                background: "#fbbf24",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: Math.round(size * 0.03),
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: Math.round(size * 0.04),
              }}
            >
              <span style={{ fontSize: titleSize, fontWeight: 800, letterSpacing: "-0.08em" }}>EO</span>
              <span style={{ fontSize: subtitleSize, fontWeight: 700, letterSpacing: "0.16em" }}>OFFLINE</span>
            </div>

            <div
              style={{
                display: "flex",
                width: "100%",
                borderTop: `${strokeWidth}px solid rgba(255,247,237,0.25)`,
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
