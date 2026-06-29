import { Link } from "react-router-dom";

interface FooterProps {
  variant?: "default" | "echelon";
}

export function Footer({ variant = "echelon" }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-separator mt-auto">
      <div className="container-wide py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          <div className="space-y-3">
            <p className="text-label">Platform</p>
            <div className="text-sm space-y-1.5">
              <Link to="/" className="block text-foreground/80 hover:text-accent transition-colors">Member App</Link>
              <Link to="/gym-management" className="block text-foreground/80 hover:text-accent transition-colors">Gym Management</Link>
              <Link to="/support" className="block text-foreground/80 hover:text-accent transition-colors">Support</Link>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-label">Company</p>
            <div className="text-sm space-y-1.5">
              <Link to="/contact" className="block text-foreground/80 hover:text-accent transition-colors">Contact</Link>
              <Link to="/privacy" className="block text-foreground/80 hover:text-accent transition-colors">Privacy</Link>
              <Link to="/terms" className="block text-foreground/80 hover:text-accent transition-colors">Terms</Link>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-label">Contact</p>
            <div className="text-sm text-foreground/80 space-y-1.5">
              <a href="mailto:hello@se7en.fit" className="block hover:text-accent transition-colors">hello@se7en.fit</a>
              <a href="mailto:support@se7en.fit" className="block hover:text-accent transition-colors">support@se7en.fit</a>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-label">Legal</p>
            <div className="text-sm text-muted-foreground space-y-1.5">
              <p>© {currentYear} SE7EN FIT</p>
              <p>All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-separator overflow-hidden py-6 md:py-10">
        <div className="flex whitespace-nowrap animate-marquee">
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className="font-display text-6xl md:text-8xl lg:text-[10rem] font-bold text-foreground/90 mx-10"
            >
              SE7EN<span className="text-accent">.</span>FIT
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
