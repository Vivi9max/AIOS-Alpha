export default function MainContent({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "#f8fafc",
      }}
    >
      {children}
    </section>
  );
}