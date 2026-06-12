import { combatLevel } from '@exchange-wars/engine';
import { useRef } from 'react';
import { diveRecords, diveStreak, fmtCompact, type Game } from '../game';

/**
 * Share an image Blob via the native share sheet (files) when supported, else download it. The share
 * path is the modern mobile one (and is unit-testable by mocking `canShare`); the download fallback is
 * browser-only (jsdom has no `URL.createObjectURL`) and is guarded. Pure of component state.
 */
export async function shareOrDownload(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] }).catch(() => {});
    return;
  }
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    // an environment without object URLs / anchor downloads (e.g. jsdom) — nothing more to do
  }
}

// Styles EMBEDDED in the SVG (literal colours + font stacks with system fallbacks) so the card is
// self-contained: it renders correctly on-page AND when serialized to a standalone .svg file that has
// no access to the page's `:root` variables or web fonts.
const CARD_CSS = `
  .bc-title { fill:#e8c869; font:700 22px Cinzel,Georgia,serif; letter-spacing:3px; }
  .bc-byline { fill:#e6d8b8; font:12px Cinzel,Georgia,serif; letter-spacing:1px; }
  .bc-hero { fill:#e6d8b8; font:700 38px 'IBM Plex Mono',Consolas,monospace; }
  .bc-hero.gold { fill:#e8c869; }
  .bc-herolabel { fill:#9d8f72; font:11px 'IBM Plex Mono',Consolas,monospace; letter-spacing:1px; }
  .bc-chipval { fill:#7fd98a; font:600 16px 'IBM Plex Mono',Consolas,monospace; }
  .bc-chiplabel { fill:#9d8f72; font:10px 'IBM Plex Mono',Consolas,monospace; letter-spacing:.5px; }
  .bc-foot { fill:#8a7a4a; font:10px 'IBM Plex Mono',Consolas,monospace; }
`;

/**
 * A shareable "Run Card" — your run as a styled trophy in the game's stone-and-gold livery: combat
 * level + net worth hero figures, your peak achievements as a chip row (empty ones omitted), your
 * handle as a byline, and the seed + site as a footer. Self-contained (embedded styles), so the
 * "💾 save" action can export it as an SVG image to share or download. Pure display + the export.
 */
export function BragCard({ game, worth, handle }: { game: Game; worth: number; handle?: string }) {
  const who = (handle ?? '').trim();
  const svgRef = useRef<SVGSVGElement>(null);
  const xp = game.world.agents[game.playerId]?.combatXp;
  const cmb = combatLevel(xp);
  const streak = diveStreak(game.delves);
  const records = diveRecords(game.delves);
  const chips: { label: string; value: string }[] = [];
  if (records.bestHaul) chips.push({ label: 'best haul', value: `${fmtCompact(records.bestHaul.lootGp)} gp` });
  if (streak.best > 0) chips.push({ label: 'survival', value: `${streak.best} dives` });
  if (game.milestones.length > 0) chips.push({ label: 'deeds', value: String(game.milestones.length) });

  const save = (): void => {
    const svg = svgRef.current;
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const doc = `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
    void shareOrDownload(new Blob([doc], { type: 'image/svg+xml' }), `exchange-wars-seed-${game.world.seed}.svg`);
  };

  return (
    <section className="panel runcard">
      <h2>
        Run Card <span className="dim small">— save, share or screenshot</span>{' '}
        <button className="chip" title="save or share your run card as an image" onClick={save}>
          💾 save
        </button>
      </h2>
      <svg ref={svgRef} className="bragcard" viewBox="0 0 480 270" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="your run card">
        <style>{CARD_CSS}</style>
        <defs>
          <linearGradient id="bc-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#241d12" />
            <stop offset="100%" stopColor="#0e0a05" />
          </linearGradient>
        </defs>
        <rect x={2} y={2} width={476} height={266} rx={10} fill="url(#bc-sky)" stroke="#d4a937" strokeWidth={2} />
        <text x={240} y={who ? 38 : 42} className="bc-title" textAnchor="middle">
          ⚔ EXCHANGE WARS
        </text>
        {who && (
          <text x={240} y={54} className="bc-byline" textAnchor="middle">
            — {who} —
          </text>
        )}
        <line x1={44} y1={who ? 64 : 58} x2={436} y2={who ? 64 : 58} stroke="#5b4a25" strokeWidth={1} />
        {/* hero figures: combat level · net worth */}
        <text x={140} y={124} className="bc-hero" textAnchor="middle">
          {cmb}
        </text>
        <text x={140} y={146} className="bc-herolabel" textAnchor="middle">
          combat level
        </text>
        <text x={340} y={124} className="bc-hero gold" textAnchor="middle">
          {fmtCompact(worth)}
        </text>
        <text x={340} y={146} className="bc-herolabel" textAnchor="middle">
          net worth (gp)
        </text>
        {/* secondary achievement chips (centred row, empty ones omitted) */}
        {chips.map((c, i) => {
          const x = 240 + (i - (chips.length - 1) / 2) * 130;
          return (
            <g key={c.label}>
              <text x={x} y={196} className="bc-chipval" textAnchor="middle">
                {c.value}
              </text>
              <text x={x} y={214} className="bc-chiplabel" textAnchor="middle">
                {c.label}
              </text>
            </g>
          );
        })}
        <text x={240} y={252} className="bc-foot" textAnchor="middle">
          {who ? `${who} · ` : ''}seed {game.world.seed} · kalilinux1993.github.io/exchange-wars
        </text>
      </svg>
    </section>
  );
}
