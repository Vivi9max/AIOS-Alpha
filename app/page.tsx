import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import ChatPanel from "@/components/chat/ChatPanel";

export default function HomePage() {
  return (
    <main className="flex h-screen bg-gray-50">

      <Sidebar />

      <section className="flex-1 flex flex-col">

        <Header />

        <div className="flex-1 p-6 overflow-hidden">

          <ChatPanel />

        </div>

      </section>

    </main>
  );
}