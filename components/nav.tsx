'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Student-facing top nav. The teacher dashboard (/dashboard) is deliberately
// NOT linked here, it is reached by direct URL and protected by the PIN gate.
const LINKS = [
  { href: '/', label: 'หน้าแรก' },
  { href: '/quiz', label: 'ทบทวน' },
  { href: '/practice/p1', label: 'ฝึกคำ' },
  { href: '/leaderboard', label: 'อันดับ' },
  { href: '/instructions', label: 'วิธีเล่น' },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <nav className="max-w-5xl mx-auto flex items-center gap-1 px-4 h-14">
        <span className="font-bold text-[#35389D] mr-3">บัญชีคำ</span>
        {LINKS.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                active ? 'bg-[#35389D] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
