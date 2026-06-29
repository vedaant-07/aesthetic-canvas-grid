import { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

interface LayoutProps {
  children: ReactNode;
  hideFooter?: boolean;
  noPadding?: boolean;
  showEchelonFooter?: boolean;
  headerRevealMode?: boolean;
}

export function Layout({ 
  children, 
  hideFooter = false, 
  noPadding = false,
  showEchelonFooter = false,
  headerRevealMode = false,
}: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header revealMode={headerRevealMode} />
      <main className={`flex-1 ${noPadding ? '' : 'pt-20 md:pt-24'}`}>
        {children}
      </main>
      {!hideFooter && (
        <Footer variant={showEchelonFooter ? "echelon" : "default"} />
      )}
    </div>
  );
}
