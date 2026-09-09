import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1F3D34",
          borderRadius: "36px",
        }}
      >
        <span
          style={{
            fontSize: 120,
            fontWeight: "bold",
            color: "#E0952A",
            fontFamily: "Georgia, serif",
          }}
        >
          A
        </span>
      </div>
    ),
    { ...size }
  );
}