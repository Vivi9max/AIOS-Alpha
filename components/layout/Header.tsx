export default function Header() {
  return (
    <header
      style={{
        height: 64,
        background: "#111827",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        borderBottom: "1px solid #1f2937",
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 20,
          fontWeight: 700,
        }}
      >
        AIOS Alpha
      </h2>

      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "#374151",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
        }}
      >
        V
      </div>
    </header>
  );
}