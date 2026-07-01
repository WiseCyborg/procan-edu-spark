import { Link } from 'react-router-dom';

export const Footer = () => (
  <footer role="contentinfo" className="border-t bg-background py-8 mt-12">
    <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
      <p>© {new Date().getFullYear()} ProCann Education. All rights reserved.</p>
      <nav aria-label="Footer navigation" className="mt-4 space-x-4">
        <Link to="/accessibility" className="hover:text-foreground transition-colors">
          Accessibility
        </Link>
        <Link to="/faq" className="hover:text-foreground transition-colors">
          FAQ
        </Link>
        <Link to="/about-team" className="hover:text-foreground transition-colors">
          About
        </Link>
      </nav>
    </div>
  </footer>
);
