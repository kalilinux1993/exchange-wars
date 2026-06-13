/**
 * Set your public handle — the name shown on your brags (📋), challenge/duel links (⚔), the Hall Run
 * Card, and the leaderboard. It lives in the Hall because it must be reachable WITHOUT the cloud: the
 * only other setter is the LeaderboardPanel submit row, which is gated behind both sign-in AND a live
 * leaderboard backend. With the board absent (the default) or signed out, a player could brag/challenge/
 * show a card but had no way to stop being anonymous. Pure presentational — the parent (App) owns the
 * value and its raw-string persistence (single source of truth), so a just-typed name flows live into
 * every artifact that reads it.
 */
export function HandleField({ handle, onChange }: { handle: string; onChange: (v: string) => void }) {
  const set = handle.trim().length > 0;
  return (
    <section className="panel identity">
      <h2>Your Handle</h2>
      <input
        className="handle-input"
        aria-label="your handle"
        placeholder="set a public name"
        maxLength={24}
        value={handle}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="dim small">
        {set
          ? 'shown on your brags, challenge links, Run Card & the leaderboard'
          : 'anonymous — set a name so your brags & challenges carry it'}
      </p>
    </section>
  );
}
