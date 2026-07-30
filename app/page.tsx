'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { signInStudent } from '@/services/db';

export default function OnboardingPage() {
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const saved = Cookies.get('username');
    if (saved) setUsername(saved);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    try {
      // Anonymous Supabase auth (creates a secure uid), adopts any legacy
      // progress tied to this nickname, registers the student row.
      await signInStudent(trimmed);
      Cookies.set('username', trimmed, { expires: 30 });
      if (typeof window !== 'undefined') {
        localStorage.setItem('username', trimmed);
      }
      router.push('/quiz');
    } catch (err) {
      console.error('Sign-in failed:', err);
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#35389D] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <h1 className="text-white text-5xl font-bold text-center mb-12">บัญชีคำ ป.1</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ใส่ชื่อเล่น"
            className="w-full p-4 rounded-lg text-lg text-center"
            required
            disabled={busy}
          />
          <button
            type="submit"
            className="w-full bg-[#000000] text-white p-4 rounded-lg text-lg font-medium hover:bg-[#222] transition-colors disabled:opacity-60"
            disabled={busy}
          >
            {busy ? '...' : 'เริ่ม'}
          </button>
        </form>
      </div>
    </main>
  );
}
