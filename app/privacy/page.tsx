import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main
      style={{
        minHeight:
          "100vh",

        padding:
          "40px 20px",

        boxSizing:
          "border-box",

        background:
          "#f8fafc",
      }}
    >
      <article
        style={{
          width:
            "100%",

          maxWidth:
            760,

          margin:
            "0 auto",

          padding:
            28,

          boxSizing:
            "border-box",

          borderRadius:
            22,

          background:
            "#ffffff",

          border:
            "1px solid #e2e8f0",

          boxShadow:
            "0 16px 48px rgba(15, 23, 42, 0.08)",
        }}
      >
        <div
          style={{
            color:
              "#2563eb",

            fontSize:
              13,

            fontWeight:
              800,
          }}
        >
          AIOS ALPHA
        </div>

        <h1
          style={{
            margin:
              "8px 0 0",

            color:
              "#0f172a",

            fontSize:
              32,
          }}
        >
          Alpha 隐私说明
        </h1>

        <p
          style={{
            margin:
              "12px 0 0",

            color:
              "#64748b",

            lineHeight:
              1.75,
          }}
        >
          更新日期：2026年7月
        </p>

        <section
          style={{
            marginTop:
              28,
          }}
        >
          <h2>
            1. 当前测试性质
          </h2>

          <p
            style={{
              color:
                "#475569",

              lineHeight:
                1.8,
            }}
          >
            AIOS Alpha
            是封闭测试版本，功能、界面和数据结构仍可能发生变化。请勿提交密码、银行卡资料、身份证件或其他高度敏感信息。
          </p>
        </section>

        <section
          style={{
            marginTop:
              24,
          }}
        >
          <h2>
            2. 收集的数据
          </h2>

          <p
            style={{
              color:
                "#475569",

              lineHeight:
                1.8,
            }}
          >
            为提供 Memory、Tasks、Profile
            和 Feedback 功能，系统会保存用户主动输入的对话、任务、个人资料字段和反馈内容。
          </p>
        </section>

        <section
          style={{
            marginTop:
              24,
          }}
        >
          <h2>
            3. 数据隔离
          </h2>

          <p
            style={{
              color:
                "#475569",

              lineHeight:
                1.8,
            }}
          >
            Alpha
            版本会为每个浏览器身份建立独立的数据空间。不同用户的任务、记忆、个人资料和反馈使用不同的存储键。
          </p>
        </section>

        <section
          style={{
            marginTop:
              24,
          }}
        >
          <h2>
            4. AI 服务
          </h2>

          <p
            style={{
              color:
                "#475569",

              lineHeight:
                1.8,
            }}
          >
            用户输入可能被发送给当前启用的第三方 AI
            模型提供商，用于生成回答。请不要输入不希望交由 AI
            服务处理的机密信息。
          </p>
        </section>

        <section
          style={{
            marginTop:
              24,
          }}
        >
          <h2>
            5. 数据稳定性
          </h2>

          <p
            style={{
              color:
                "#475569",

              lineHeight:
                1.8,
            }}
          >
            虽然系统采用持久化存储，但 Alpha
            阶段不保证数据永久保存。版本升级或测试重置可能导致部分数据被清除。
          </p>
        </section>

        <section
          style={{
            marginTop:
              24,
          }}
        >
          <h2>
            6. 用户反馈
          </h2>

          <p
            style={{
              color:
                "#475569",

              lineHeight:
                1.8,
            }}
          >
            测试用户提交的反馈可能用于修复问题、改善体验和决定后续产品方向。
          </p>
        </section>

        <Link
          href="/alpha"
          style={{
            display:
              "inline-flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            minHeight:
              46,

            marginTop:
              30,

            padding:
              "0 18px",

            borderRadius:
              13,

            background:
              "#0f172a",

            color:
              "#ffffff",

            fontWeight:
              800,

            textDecoration:
              "none",
          }}
        >
          返回 Alpha 入口
        </Link>
      </article>
    </main>
  );
}