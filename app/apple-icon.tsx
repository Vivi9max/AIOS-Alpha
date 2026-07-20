import {
  ImageResponse,
} from "next/og";

export const size = {
  width:
    180,

  height:
    180,
};

export const contentType =
  "image/png";

export default function AppleIcon() {
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

          flexDirection:
            "column",

          alignItems:
            "center",

          justifyContent:
            "center",

          borderRadius:
            38,

          background:
            "linear-gradient(145deg, #0f172a 0%, #172554 100%)",

          color:
            "#ffffff",
        }}
      >
        <div
          style={{
            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            fontSize:
              66,

            fontWeight:
              950,

            letterSpacing:
              "-0.08em",

            lineHeight:
              1,
          }}
        >
          AI
        </div>

        <div
          style={{
            display:
              "flex",

            marginTop:
              13,

            color:
              "#93c5fd",

            fontSize:
              17,

            fontWeight:
              800,

            letterSpacing:
              "0.12em",
          }}
        >
          ALPHA
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}