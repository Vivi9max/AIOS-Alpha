export default function InviteBanner() {
  return (
    <section
      style={{
        display:
          "flex",

        alignItems:
          "flex-start",

        gap:
          12,

        padding:
          "14px 16px",

        borderRadius:
          14,

        background:
          "linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)",

        border:
          "1px solid #bfdbfe",

        boxShadow:
          "0 8px 24px rgba(37, 99, 235, 0.06)",
      }}
    >
      <div
        style={{
          flexShrink:
            0,

          width:
            38,

          height:
            38,

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "center",

          borderRadius:
            12,

          background:
            "#dbeafe",

          fontSize:
            20,
        }}
      >
        🚀
      </div>

      <div>
        <div
          style={{
            color:
              "#0f172a",

            fontSize:
              15,

            fontWeight:
              800,
          }}
        >
          Welcome to AIOS Alpha
        </div>

        <div
          style={{
            marginTop:
              4,

            color:
              "#475569",

            fontSize:
              13,

            lineHeight:
              1.55,
          }}
        >
          你正在使用 AIOS Alpha
          首批封闭测试版本。你的任务、记忆和个人资料已经独立存储。
        </div>
      </div>
    </section>
  );
}