import Nav from '@/components/nav';

// Route group (app): every page in here gets the student-facing top nav.
// Login (/) and the teacher dashboard (/dashboard) live OUTSIDE this group,
// so they render full-screen with no nav.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      {children}
    </>
  );
}
