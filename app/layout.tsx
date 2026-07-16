import "./global.css";

import type {
  Metadata,
  Viewport,
} from "next";

export const metadata:
  Metadata = {
  title: {
    default:
      "AIOS Alpha",
    template:
      "%s · AIOS Alpha",
  },

  description:
    "AIOS Alpha — AI-powered workspace for conversations, memory, tasks and execution.",

  applicationName:
    "AIOS Alpha",

  keywords: [
    "AIOS",
    "AI workspace",
    "AI agent",
    "Memory",
    "Tasks",
    "DeepSeek",
  ],

  authors: [
    {
      name:
        "AIOS Alpha",
    },
  ],

  creator:
    "AIOS Alpha",

  robots: {
    index: false,
    follow: false,
  },

  appleWebApp: {
    capable: true,
    title:
      "AIOS Alpha",
    statusBarStyle:
      "black-translucent",
  },

  formatDetection: {
    telephone: false,
  },
};

export const viewport:
  Viewport = {
  width:
    "device-width",

  initialScale: 1,

  maximumScale: 1,

  viewportFit:
    "cover",

  themeColor:
    "#111827",
};

export default function RootLayout({
  children,
}: Readonly<{
  children:
    React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
      </body>
    </html>
  );
}