import type { Metadata } from "next";
import "../styles/index.css";
import "../styles/App.css";
import Footer from "../components/Footer";
import HashRedirect from "../components/HashRedirect";

export const metadata: Metadata = {
  title: "B[U]ILT @ UIUC",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="App">
          <HashRedirect />
          {children}
          <Footer />
        </div>
      </body>
    </html>
  );
}
