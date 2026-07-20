import {
  ImageResponse,
} from "next/og";

export const size = {
  width:
    64,

  height:
    64,
};

export const contentType =
  "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width:
            "100%",

          height:
            "100%",

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "center",

          borderRadius:
            16,

          background:
            "linear-gradient(145deg, #0f172a 0%, #172554 100%)",

          color:
            "#ffffff",

          fontSize:
            27,

          fontWeight:
            900,

          letterSpacing:
            "-0.08em",
        }}
      >
        AI
      </div>
    ),
    {
      ...size,
    }
  );
}