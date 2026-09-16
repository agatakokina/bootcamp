import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/test-cases", label: "Test Cases" },
  { to: "/test-suites", label: "Suites" },
  { to: "/test-runs", label: "Runs" },
  { to: "/bugs", label: "Bugs" },
  { to: "/reports", label: "Reports" },
  { to: "/settings", label: "Settings" },
];

function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer automatically whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="app-nav">
      <div className="app-nav-inner">
        <Link to="/" className="app-nav-brand">
          Bootcamp App
        </Link>

        <button
          type="button"
          className="app-nav-toggle"
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`app-nav-links${menuOpen ? " open" : ""}`}>
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `app-nav-link${isActive ? " active" : ""}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}

export default NavBar;
