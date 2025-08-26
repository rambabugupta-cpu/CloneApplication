import { ReactNode } from "react";
import Navigation from "./Navigation";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="md:ml-64 transition-all duration-300">
        {children}
      </main>
    </div>
  );
}

export default Layout;