import AIOSCNChatPanel from "@/components/chat/AIOSCNChatPanel";
export const dynamic =
  "force-dynamic";
export default function CNPage() {
  return (
    <main
      style={{
        minHeight:
          "100vh",
        padding:
          "18px",
        background:
          "#f8fafc",
        boxSizing:
          "border-box",
      }}
    >
      <div
        style={{
          width:
            "100%",
          maxWidth:
            1100,
          margin:
            "0 auto",
        }}
      >
        <AIOSCNChatPanel />
      </div>
    </main>
  );
}
