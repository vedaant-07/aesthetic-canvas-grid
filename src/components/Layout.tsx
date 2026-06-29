import { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

interface LayoutProps {
  children: ReactNode;
  hideFooter?: boolean;
  noPadding?: boolean;
  headerRevealMode?: boolean;
}

export function Layout({
  children,
  hideFooter = false,
  noPadding = false,
  headerRevealMode = false,
}: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header revealMode={headerRevealMode} />
      <main className={`flex-1 ${noPadding ? '' : 'pt-16 md:pt-20'}`}>
        {children}
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
}
