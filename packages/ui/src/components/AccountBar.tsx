import { useState } from 'react';
import { sendMagicLink, signOut, type Session } from '../cloud';

export function AccountBar({ session, lastSync }: { session: Session | null; lastSync: number | null }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  if (session) {
    return (
      <div className="account">
        <span className="dim small">{session.user.email}</span>
        {lastSync !== null && <span className="up small">✓ synced</span>}
        <button className="chip" onClick={() => void signOut()}>
          sign out
        </button>
      </div>
    );
  }
  return (
    <div className="account">
      <input
        placeholder="email — sign in to sync"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        inputMode="email"
      />
      <button
        className="chip"
        disabled={!email.includes('@')}
        onClick={() => {
          setStatus('sending…');
          void sendMagicLink(email).then((err) => setStatus(err ?? 'check your email for the link'));
        }}
      >
        sign in
      </button>
      {status && <span className="dim small">{status}</span>}
    </div>
  );
}
