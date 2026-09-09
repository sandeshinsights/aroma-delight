import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: "6px",
        }}
      >
        <span
          style={{
            fontSize: 22,
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