import { Outlet, Link, useLocation } from 'react-router-dom';

const nav = [
  { to: '/', label: 'Home' },
  { to: '/example/refine-goal', label: 'Example: Refine Goal' },
  { to: '/login', label: 'Login' },
  { to: '/register', label: 'Register' },
  { to: '/onboarding', label: 'Onboarding' },
  { to: '/goals', label: 'Goals' },
  { to: '/profile', label: 'Profile' },
  { to: '/learning-path', label: 'Learning Path' },
  { to: '/knowledge', label: 'Knowledge' },
  { to: '/skill-gap', label: 'Skill Gap' },
];

export function Layout() {
  const location = useLocation();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav
        style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid #eee',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        {nav.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            style={{
              color: location.pathname === to ? '#0a0' : '#333',
              textDecoration: location.pathname === to ? 'underline' : 'none',
            }}
          >
            {label}
          </Link>
        ))}
      </nav>
      <main style={{ flex: 1, padding: '1rem' }}>
        <Outlet />
      </main>
    </div>
  );
}
