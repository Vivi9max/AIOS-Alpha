"use client";

import {
  APP_BADGE,
} from "@/lib/config/app";

export default function AlphaBadge() {
  return (
    <div
      style={{
        display:
          "inline-flex",

        alignItems:
          "center",

        gap: 8,

        padding:
          "6px 12px",

        borderRadius:
          999,

        background:
          "#eef6ff",

        border:
          "1px solid #bfdbfe",

        fontSize:
          13,

        fontWeight:
          600,

        color:
          "#1d4ed8",
      }}
    >
      🚀 {APP_BADGE}
    </div>
  );
}
