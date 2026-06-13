import { useState } from 'react';
import { sendMagicLink, signOut, type Session } from '../cloud';

export function AccountBar({
  session,
  lastSync,
  syncFailed = false,
}: {
  session: Session | null;
  lastSync: number | null;
  /** The last cloud push failed — show "unsynced" instead of a stale "✓ synced" (19d). */
  syncFailed?: boolean;
}) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  if (session) {
    return (
      <div className="account">
        <span className="dim small">{session.user.email}</span>
        {syncFailed ? (
          <span className="down small" title="couldn't reach the cloud — your latest progress isn't backed up yet; it retries as you play">
            ⚠ unsynced
          </span>
        ) : lastSync !== null ? (
          <span className="up small" title="your progress is backed up to the cloud">
            ✓ synced
          </span>
        ) : null}
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
