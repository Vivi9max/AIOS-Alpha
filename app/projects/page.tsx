import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";

const projects = [
  {
    name: "AIOS Alpha",
    status: "Running",
  },
  {
    name: "Content OS",
    status: "Planning",
  },
  {
    name: "Brain Engine",
    status: "Building",
  },
  {
    name: "Film Studio",
    status: "Waiting",
  },
];

export default function ProjectsPage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#f5f7fb",
      }}
    >
      <Header />

      <div
        style={{
          display: "flex",
          flex: 1,
        }}
      >
        <Sidebar />

        <main
          style={{
            flex: 1,
            padding: 40,
            overflow: "auto",
          }}
        >
          <h1
            style={{
              fontSize: 36,
              marginBottom: 10,
            }}
          >
            📂 Projects
          </h1>

          <p
            style={{
              color: "#666",
              marginBottom: 30,
            }}
          >
            AIOS Project Center
          </p>

          {projects.map((item) => (
            <div
              key={item.name}
              style={{
                background: "#fff",
                padding: 20,
                borderRadius: 14,
                marginBottom: 18,
                boxShadow: "0 2px 10px rgba(0,0,0,.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <strong>{item.name}</strong>

              <span
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  background: "#e8f5e9",
                  color: "#2e7d32",
                  fontWeight: 600,
                }}
              >
                {item.status}
              </span>
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}