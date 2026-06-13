import { applyCommand, EVENT_LABELS, levelsOf, playerView, REGIONS, regionIndex, runTicks, tickWorld } from '@exchange-wars/engine';
import type { CommandResult, ItemId, PlayerCommand } from '@exchange-wars/engine';
import { chooseSave, getSupabase, loadCloudSave, pushCloudSave, type Session } from './cloud';
import { AccountBar } from './components/AccountBar';
import { AlmanacPanel } from './components/AlmanacPanel';
import { BountyBoard } from './components/BountyBoard';
import { MoversPanel } from './components/MoversPanel';
import { WatchlistPanel } from './components/WatchlistPanel';
import { HELP_SEEN_KEY, HelpOverlay } from './components/HelpOverlay';
import { ExpeditionPanel } from './components/ExpeditionPanel';
import { EmbarkPanel } from './components/EmbarkPanel';
import { LeaderboardPanel } from './components/LeaderboardPanel';
import { BookLadder } from './components/BookLadder';
import { ContractsBoard } from './components/ContractsBoard';
import { NewsLog } from './components/NewsLog';
import { useEffect, useReducer, useRef, useState } from 'react';
import { MarketTable } from './components/MarketTable';
import { FirstSteps } from './components/FirstSteps';
import { ItemIcon } from './components/Icon';
import { TopFlips } from './components/TopFlips';
import { ProfitPanel } from './components/ProfitPanel';
import { PositionsPanel } from './components/PositionsPanel';
import { MilestonesPanel } from './components/MilestonesPanel';
import { RecordsPanel } from './components/RecordsPanel';
import { ConquestPanel } from './components/ConquestPanel';
import { BragCard } from './components/BragCard';
import { DelvePanel } from './components/DelvePanel';
import { Sparkline } from './components/Sparkline';
import type { TicketPrefill } from './components/TradeTicket';
import { PlayerPanel } from './components/PlayerPanel';
import { WealthPanel } from './components/WealthPanel';
import { TradeFeed } from './components/TradeFeed';
import { TradeTicket } from './components/TradeTicket';
import { UpgradeShop } from './components/UpgradeShop';
import { WorthChart } from './components/WorthChart';
import {
  alertHit,
  bandAlertHit,
  richAlertHit,
  markRooms,
  reconcileEvents,
  type CapturedEvent,
  bumpStreak,
  streakCelebration,
  recordDailyBest,
  dailyBestView,
  beatRecord,
  DELVE_LOG_CAP,
  isNewBestHaul,
  diveStreak,
  isStreakMilestone,
  checkMilestones,
  MILESTONES,
  finishOfflineProgress,
  dailySeed,
  fmtDuration,
  ghostForRestart,
  parseChallengeSeed,
  parseChallengeTarget,
  challengeLink,
  type ChallengeTarget,
  planOfflineProgress,
  clearSave,
  discardCorruptSave,
  exportSaveString,
  fmtCompact,
  importSaveString,
  loadCorruptSave,
  loadGame,
  newGame,
  offlineRatePerMin,
  openFromBook,
  recordFills,
  leveledUp,
  fillToastFlavor,
  playerWorth,
  bragText,
  restartStakes,
  recordWorth,
  saveGame,
  streakAtRisk,
  updateNews,
  worthRate,
  type DailyStreak,
  type DailyBest,
  type Game,
  type Milestone,
  type OfflinePlan,
  type OfflineResult,
} from './game';
import { usePref } from './usePref';
import { resolveShortcut } from './keyboard';

const SPEEDS = [0, 1, 5, 20] as const;
// Offline catch-ups at or under this run synchronously (sub-second); bigger
// ones run in chunks behind the catch-up overlay so the tab never freezes
// (the 100k-tick cap is ~14s of solid sim at 100 items).
const SYNC_CATCHUP_TICKS = 5_000;
const CATCHUP_CHUNK_TICKS = 1_000;

export function App({ initial }: { initial?: Game }) {
  const gameRef = useRef<Game | null>(null);
  const offlineRef = useRef<OfflineResult | null>(null);
  const hadSaveRef = useRef(false);
  if (gameRef.current === null) {
    const saved = initial ?? loadGame();
    hadSaveRef.current = saved !== null && saved !== undefined;
    gameRef.current = saved ?? newGame(42);
  }
  const game = gameRef.current;
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [speed, setSpeed] = useState(0); // ticks per second; world starts paused
  const [selected, setSelected] = useState<ItemId>(game.world.items[0]?.id ?? '');
  const [lastResult, setLastResult] = useState<CommandResult | null>(null);
  const [awayDismissed, setAwayDismissed] = useState(false);
  const [challenge, setChallenge] = useState<number | null>(null);
  const [challengeTarget, setChallengeTarget] = useState<ChallengeTarget | null>(null);
  const [catchUp, setCatchUp] = useState<{ done: number; total: number } | null>(null);
  const planRef = useRef<OfflinePlan | null>(null);
  // The game a chunked catch-up was planned FOR — so the driver can abort if `gameRef` is
  // swapped (cloud-adopt / import / restart) mid-flight rather than run the stale plan's
  // ticks against, or finalize it against, a different game (16j save-flow review fix).
  const catchUpGame = useRef<Game | null>(null);
  const [toast, setToast] = useState<Milestone | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [seedDraft, setSeedDraft] = useState<string | null>(null);
  // A previous save we couldn't read, quarantined at boot (loadGame). Surfaced
  // once so the player can rescue it instead of losing the run silently.
  const [corruptSave, setCorruptSave] = useState<string | null>(() => loadCorruptSave());
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [prefill, setPrefill] = useState<TicketPrefill | null>(null);
  const [regionPick, setRegionPick] = useState<{ regionId: string; n: number } | null>(null);
  const [helpOpen, setHelpOpen] = useState(() => localStorage.getItem(HELP_SEEN_KEY) === null);
  type Room = 'exchange' | 'adventure' | 'hall';
  const [room, setRoom] = useState<Room>(() => {
    const saved = localStorage.getItem('ew-room');
    return saved === 'adventure' || saved === 'hall' ? saved : 'exchange';
  });
  const roomRef = useRef<Room>(room);
  roomRef.current = room;
  // "Unseen activity" dots per tab — set when an off-tab event fires (16r), cleared on visiting the tab.
  const [unseen, setUnseen] = useState<Record<string, boolean>>({});
  const pickRoom = (r: Room): void => {
    setRoom(r);
    localStorage.setItem('ew-room', r);
    setUnseen((u) => (u[r] ? { ...u, [r]: false } : u)); // clear the badge on visit
  };
  const [watch, setWatch] = usePref<string[]>('ew-watch', []);
  const toggleWatch = (id: string): void => {
    setWatch(watch.includes(id) ? watch.filter((x) => x !== id) : [...watch, id]);
  };
  const [alerts, setAlerts] = usePref<Record<string, number>>('ew-alerts', {});
  const [sellAlerts, setSellAlerts] = usePref<Record<string, number>>('ew-sell-alerts', {});
  const [bandAlerts, setBandAlerts] = usePref<Record<string, boolean>>('ew-band-alerts', {});
  const [richAlerts, setRichAlerts] = usePref<Record<string, boolean>>('ew-rich-alerts', {});
  const [streak, setStreak] = usePref<DailyStreak | null>('ew-daily-streak', null);
  const [dailyBest, setDailyBest] = usePref<DailyBest | null>('ew-daily-best', null);
  const alertFired = useRef<Set<string>>(new Set());
  const sellFired = useRef<Set<string>>(new Set());
  const bandFired = useRef<Set<string>>(new Set());
  const richFired = useRef<Set<string>>(new Set());
  // Market-event capture for end recaps (15z): the price each active event began at, keyed by event id.
  // `captureGame` guards a game swap so a cloud-adopt/restart never recaps the old game's events.
  const eventCapture = useRef<Record<string, CapturedEvent>>({});
  const eventCaptureGame = useRef<Game | null>(null);
  const setAlert = (id: string, price: number | null): void => {
    const next = { ...alerts };
    if (price === null || !Number.isFinite(price) || price <= 0) delete next[id];
    else next[id] = price;
    setAlerts(next);
    alertFired.current.delete(id); // re-arm on edit
  };
  const setSellAlert = (id: string, price: number | null): void => {
    const next = { ...sellAlerts };
    if (price === null || !Number.isFinite(price) || price <= 0) delete next[id];
    else next[id] = price;
    setSellAlerts(next);
    sellFired.current.delete(id); // re-arm on edit
  };
  const setBandAlert = (id: string, on: boolean): void => {
    const next = { ...bandAlerts };
    if (on) next[id] = true;
    else delete next[id];
    setBandAlerts(next);
    bandFired.current.delete(id); // re-arm on toggle
  };
  const setRichAlert = (id: string, on: boolean): void => {
    const next = { ...richAlerts };
    if (on) next[id] = true;
    else delete next[id];
    setRichAlerts(next);
    richFired.current.delete(id); // re-arm on toggle
  };
  const closeHelp = (): void => {
    localStorage.setItem(HELP_SEEN_KEY, '1');
    setHelpOpen(false);
  };
  const prefillNonce = useRef(0);
  const onLevel = (side: 'buy' | 'sell', price: number): void => {
    prefillNonce.current++;
    setPrefill({ side, price, n: prefillNonce.current });
  };
  // Jump from a Delve Log entry (Hall) straight to that region on the Adventure
  // tab — a nonce pulse so repeat clicks on the same region re-fire (mirrors the
  // ticket prefill). No-op while a dive is in flight (ExpeditionPanel guards it).
  const regionPickNonce = useRef(0);
  const jumpToRegion = (regionId: string): void => {
    regionPickNonce.current++;
    setRegionPick({ regionId, n: regionPickNonce.current });
    pickRoom('adventure');
  };
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;
  const adoptedRef = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedulePush = (): void => {
    if (!sessionRef.current) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      const g = gameRef.current;
      if (g) {
        void pushCloudSave(g).then((ok) => {
          if (ok) setLastSync(Date.now());
        });
      }
    }, 5_000);
  };

  /** Start offline accrual for a (possibly just-adopted) game: small debts
   * run synchronously, big ones hand off to the chunked catch-up effect. */
  const beginOffline = (g: Game): void => {
    offlineRef.current = null;
    const plan = planOfflineProgress(g, Date.now());
    if (!plan) return;
    // Offline catch-up advances world.tick via runTicks but logs NO commands; this stays
    // replay-correct ONLY because the player agent is policy:'idle' and takes no engine
    // action while away. If automation ever acts for the player offline, the verified-run
    // replay would diverge and logSince would still claim 0 — guard this before that.
    if (plan.ticks <= SYNC_CATCHUP_TICKS) {
      runTicks(g.world, plan.ticks);
      offlineRef.current = finishOfflineProgress(g, plan);
      return;
    }
    planRef.current = plan;
    catchUpGame.current = g; // tag the catch-up so the driver can detect a mid-flight game swap
    setCatchUp({ done: 0, total: plan.ticks });
  };

  // Boot: apply the offline debt and latch anything it earned — silently
  // (the away banner / catch-up overlay cover the narration). Then handle a
  // `#seed=N` challenge link: fresh visitors start on that seed directly;
  // players with a save get a bar (never clobber a run silently).
  useEffect(() => {
    const g = gameRef.current;
    if (!g) return;
    beginOffline(g);
    const v0 = playerView(g.world, g.playerId);
    if (v0) checkMilestones(g, v0, playerWorth(g));
    const ch = parseChallengeSeed(window.location.hash);
    const target = parseChallengeTarget(window.location.hash); // the claimed "beat me" figure (16s)
    if (ch !== null) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      if (!hadSaveRef.current) {
        gameRef.current = newGame(ch);
        offlineRef.current = null;
        setSelected(gameRef.current.world.items[0]?.id ?? '');
      } else if (g.world.seed !== ch) {
        setChallenge(ch);
        setChallengeTarget(target);
      }
    }
    force();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The chunked catch-up driver: one slice per timeout so the UI repaints
  // between slices; finalize latches news/fills/deeds earned while away.
  useEffect(() => {
    if (!catchUp) return;
    const g = gameRef.current;
    if (!g) return;
    // Abort if the game was swapped out from under the catch-up (cloud-adopt / import /
    // restart): NEVER advance the new world by the old plan's ticks, nor finalize the stale
    // plan against it (a data-corruption bug found by the 16j save-flow review). A swap that
    // needs its own offline accrual re-runs beginOffline, which re-tags catchUpGame.
    if (catchUpGame.current !== g) {
      planRef.current = null;
      setCatchUp(null);
      return;
    }
    if (catchUp.done >= catchUp.total) {
      const plan = planRef.current;
      planRef.current = null;
      if (plan) offlineRef.current = finishOfflineProgress(g, plan);
      updateNews(g);
      recordFills(g);
      const v = playerView(g.world, g.playerId);
      if (v) checkMilestones(g, v, playerWorth(g));
      saveGame(g);
      schedulePush();
      setCatchUp(null);
      setAwayDismissed(false);
      force();
      return;
    }
    const id = setTimeout(() => {
      const step = Math.min(CATCHUP_CHUNK_TICKS, catchUp.total - catchUp.done);
      runTicks(g.world, step);
      setCatchUp({ done: catchUp.done + step, total: catchUp.total });
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catchUp]);

  // Daily streak: whenever the active world IS today's daily, count it. bumpStreak
  // is idempotent per UTC day (returns the same ref if already counted today), so
  // this is safe on every seed change — it advances at most once per day.
  useEffect(() => {
    if (game.world.seed !== dailySeed()) return;
    const next = bumpStreak(streak, dailySeed());
    if (next !== streak) {
      const cel = streakCelebration(streak, next);
      if (cel)
        setToast({
          id: 'streak',
          name: `🔥 ${cel.count}-day daily streak!`,
          flavor: cel.best ? 'a new personal best — keep it going' : 'keep it going',
          achieved: () => false,
        });
      setStreak(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.world.seed]);

  // Daily personal best: while on today's daily, keep the highest net worth ever
  // reached on this seed (persisted, so it survives reloads and becomes the record
  // to beat next time). recordDailyBest returns the same ref unless a new high or a
  // new day, so the write only fires on a genuine record — not every tick.
  useEffect(() => {
    if (game.world.seed !== dailySeed()) return;
    const next = recordDailyBest(dailyBest, dailySeed(), playerWorth(game));
    if (next !== dailyBest) setDailyBest(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.world.tick, game.world.seed]);

  // The record to BEAT, captured once at mount before this session's play moves
  // it — null unless you loaded today's daily already holding a real prior best.
  const incomingBest = useRef<number | null | undefined>(undefined);
  if (incomingBest.current === undefined) {
    incomingBest.current =
      game.world.seed === dailySeed() && dailyBest && dailyBest.day === dailySeed() && dailyBest.best > game.startGp
        ? dailyBest.best
        : null;
  }
  // One-time "new daily record" celebration when worth first passes that mark.
  const recordCelebrated = useRef(false);
  useEffect(() => {
    if (game.world.seed !== dailySeed() || recordCelebrated.current) return;
    if (beatRecord(incomingBest.current ?? null, playerWorth(game))) {
      recordCelebrated.current = true;
      setToast({
        id: 'record',
        name: '🎉 New daily record!',
        flavor: `you beat your best of ${(incomingBest.current ?? 0).toLocaleString('en-US')} gp on today's daily`,
        achieved: () => false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.world.tick, game.world.seed]);

  // Keyboard shortcuts: 1/2/3 rooms, p pause/play, ? help. Guarded so we never
  // hijack a key while the player is typing in a field or holding a modifier.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || t?.isContentEditable) return;
      const sc = resolveShortcut(e.key);
      if (!sc) return;
      if (sc.kind === 'room') pickRoom(sc.room);
      else if (sc.kind === 'pause') setSpeed((s) => (s === 0 ? 1 : 0));
      else setHelpOpen((h) => !h);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void getSupabase()
      .auth.getSession()
      .then(({ data }) => setSession(data.session));
    const { data } = getSupabase().auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // On sign-in: adopt whichever save is newer (cloud wins ties), then keep
  // the loser updated. Adopting a cloud save runs offline accrual against
  // NOW — close on the PC, open on the phone, the world kept going.
  useEffect(() => {
    if (!session || adoptedRef.current) return;
    adoptedRef.current = true;
    void loadCloudSave().then((cloud) => {
      const local = gameRef.current;
      if (cloud && chooseSave(local, cloud) === 'cloud') {
        gameRef.current = cloud;
        beginOffline(cloud);
        saveGame(cloud);
        setSelected(cloud.world.items[0]?.id ?? '');
        setAwayDismissed(false);
        // Adopting a different save = a new run for the daily-record celebration:
        // re-capture the record to beat + re-arm, so it isn't measured against
        // the local save's stale best (would false-fire "New daily record!").
        incomingBest.current = undefined;
        recordCelebrated.current = false;
        force();
      } else if (local) {
        void pushCloudSave(local);
      }
    });
  }, [session]);

  // Previous combat levels, for the level-up celebration. Lazy init (null) so
  // loading a save with existing levels doesn't fire a phantom toast. Keyed to
  // the game OBJECT: a swap (cloud-save adoption / restart / challenge link)
  // re-baselines silently, so adopting a higher-level cloud save never fires a
  // false "level up!" — within one game the agent is mutated in place, so the
  // reference is stable and real level-ups still fire.
  const prevLevels = useRef<{ atk: number; def: number; hp: number } | null>(null);
  const levelBaselineGame = useRef<typeof game | null>(null);
  // Region-unlock celebration (15h): the frontier index when we last looked, re-baselined on a
  // game swap with the level baseline below — so a deeper adopted save doesn't false-fire.
  const prevProgress = useRef<number | null>(null);
  // Session P&L baseline (14r): net worth when this session began. App is the only
  // always-mounted owner, so the baseline survives tab switches; it re-captures on a
  // game swap (cloud-adopt / restart) — same identity guard as the level baseline above.
  const sessionBaseWorth = useRef<number | null>(null);
  const sessionBaseGame = useRef<typeof game | null>(null);
  const refreshProgress = (notifyFills = false): void => {
    const v = playerView(game.world, game.playerId);
    if (!v) return;
    const w = playerWorth(game);
    recordWorth(game, w);
    updateNews(game);
    const newFills = recordFills(game);
    // Tab-badge flags (16r): did an event relevant to a non-active room fire this refresh?
    let firedExchange = false; // fills / price-band alerts / event-recap
    let firedHall = false; // a new deed
    // Resting orders fill silently during ticks — surface them at LIVE speed only
    // (bulk/offline fills are summarized elsewhere). Lowest-priority toast: the
    // milestone/alert toasts below run after and override it on a busy tick.
    if (notifyFills) {
      const fs = fillToastFlavor(newFills, (id) => game.world.items.find((i) => i.id === id)?.name ?? id);
      if (fs) {
        setToast({ id: 'fills', name: '🪙 your offers filled', flavor: fs, achieved: () => false });
        firedExchange = true;
      }
    }
    // Swap symmetry: a game-identity change (cloud adoption / restart) re-baselines EVERY
    // cross-tick detection ref. The one-shot alert Sets are CLEARED here (fire-fresh) — for
    // INFORMATIONAL alerts, surfacing "your watched X is cheap" right after a save-load is
    // accurate, not a false achievement (unlike the celebrations below, which SUPPRESS the
    // adopted baseline). The level/progress/event baselines re-latch in their own game-keyed
    // blocks; `levelBaselineGame` is written only in the celebration block at the END, so this
    // read detects the swap for the whole tick.
    if (levelBaselineGame.current !== game) {
      alertFired.current.clear();
      sellFired.current.clear();
      bandFired.current.clear();
      richFired.current.clear();
    }
    // Price alerts: fire once when a watched item drops to its threshold;
    // re-arm only when it climbs back above (no toast spam at speed).
    for (const [id, threshold] of Object.entries(alerts)) {
      const last = v.markets.find((m) => m.itemId === id)?.lastPrice;
      if (last === undefined) continue;
      if (last <= threshold && !alertFired.current.has(id)) {
        alertFired.current.add(id);
        const name = game.world.items.find((i) => i.id === id)?.name ?? id;
        setToast({ id: `alert-${id}`, name: `⏰ ${name} ≤ ${threshold.toLocaleString('en-US')}`, flavor: `now ${last.toLocaleString('en-US')} gp — time to buy?`, achieved: () => false });
        firedExchange = true;
      } else if (last > threshold) {
        alertFired.current.delete(id);
      }
    }
    // Take-profit alerts: fire once when a watched item climbs to its sell
    // threshold; re-arm when it falls back below.
    for (const [id, threshold] of Object.entries(sellAlerts)) {
      const last = v.markets.find((m) => m.itemId === id)?.lastPrice;
      if (last === undefined) continue;
      if (alertHit(last, threshold, 'above') && !sellFired.current.has(id)) {
        sellFired.current.add(id);
        const name = game.world.items.find((i) => i.id === id)?.name ?? id;
        setToast({ id: `sell-alert-${id}`, name: `⏰ ${name} ≥ ${threshold.toLocaleString('en-US')}`, flavor: `now ${last.toLocaleString('en-US')} gp — time to sell?`, achieved: () => false });
        firedExchange = true;
      } else if (last < threshold) {
        sellFired.current.delete(id);
      }
    }
    // Value-band "buy the dip" alerts: fire once when an armed item enters the
    // cheap third of its cost→value band; re-arm when it leaves cheap. No
    // threshold — the band self-adjusts to fundamentals.
    for (const id of Object.keys(bandAlerts)) {
      if (!bandAlerts[id]) continue;
      const market = v.markets.find((m) => m.itemId === id);
      const def = game.world.items.find((i) => i.id === id);
      if (!market || !def) continue;
      if (bandAlertHit(def, market.lastPrice)) {
        if (!bandFired.current.has(id)) {
          bandFired.current.add(id);
          setToast({ id: `band-alert-${id}`, name: `🟢 ${def.name} is cheap`, flavor: `now ${market.lastPrice.toLocaleString('en-US')} gp — in its cheap band, time to accumulate?`, achieved: () => false });
          firedExchange = true;
        }
      } else {
        bandFired.current.delete(id);
      }
    }
    // Value-band "take profit" alerts (16d): the sell-side sibling — fire once when an
    // armed item enters the rich third of its band; re-arm when it leaves. Threshold-free.
    for (const id of Object.keys(richAlerts)) {
      if (!richAlerts[id]) continue;
      const market = v.markets.find((m) => m.itemId === id);
      const def = game.world.items.find((i) => i.id === id);
      if (!market || !def) continue;
      if (richAlertHit(def, market.lastPrice)) {
        if (!richFired.current.has(id)) {
          richFired.current.add(id);
          setToast({ id: `rich-alert-${id}`, name: `🟡 ${def.name} is rich`, flavor: `now ${market.lastPrice.toLocaleString('en-US')} gp — near its ceiling, take profit?`, achieved: () => false });
          firedExchange = true;
        }
      } else {
        richFired.current.delete(id);
      }
    }
    // Event-end recaps (15z): close the lifecycle the chips open. Swap-guard first
    // so a cloud-adopt/restart never recaps the old game's events (the 14e/14f class).
    if (eventCaptureGame.current !== game) {
      eventCapture.current = {};
      eventCaptureGame.current = game;
    }
    const activeEvents = (game.world.events ?? [])
      .filter((e) => e.startTick <= game.world.tick && e.endTick > game.world.tick)
      .map((e) => ({ id: e.id, itemId: e.itemId, kind: e.kind }));
    const priceOf = (itemId: string): number => v.markets.find((m) => m.itemId === itemId)?.lastPrice ?? 0;
    const { recaps, captured } = reconcileEvents(eventCapture.current, activeEvents, priceOf);
    eventCapture.current = captured;
    if (recaps.length > 0) {
      const r = recaps[recaps.length - 1]!; // last-writer-wins, like the other refreshProgress toasts
      const name = game.world.items.find((i) => i.id === r.itemId)?.name ?? r.itemId;
      const up = r.pct >= 0;
      setToast({
        id: `event-end-${r.itemId}`,
        name: `⚡ ${name} ${EVENT_LABELS[r.kind]} ended`,
        flavor: `settled ${r.startPrice.toLocaleString('en-US')}→${r.endPrice.toLocaleString('en-US')} (${up ? '+' : ''}${Math.round(r.pct * 100)}%)`,
        achieved: () => false,
      });
      firedExchange = true;
    }
    // Celebrations LAST (last-writer-wins ⇒ a rare identity moment WINS the single toast slot
    // over the frequent informational alerts/recaps above). Self-ordered fills<level<region<deed.
    const lv = levelsOf(game.world.agents[game.playerId]?.combatXp);
    const prog = game.world.agents[game.playerId]?.questProgress ?? 0;
    if (prevLevels.current === null || levelBaselineGame.current !== game) {
      // (re)baseline on first run OR a game swap — never celebrate the baseline. `prevProgress`
      // re-baselines IN LOCKSTEP with `prevLevels` here; keep them coupled (decoupling re-introduces
      // a region-unlock false-fire on a swap, the 14e/14f class).
      prevLevels.current = lv;
      prevProgress.current = prog;
      levelBaselineGame.current = game;
    } else {
      for (const u of leveledUp(prevLevels.current, lv))
        setToast({ id: 'levelup', name: `${u.glyph} ${u.name} up!`, flavor: `you reached ${u.name} ${u.level}`, achieved: () => false });
      prevLevels.current = lv;
      // A new region unlocked the moment the frontier index climbs.
      if (prevProgress.current !== null && prog > prevProgress.current) {
        const where = REGIONS[prog]?.name ?? 'a new frontier';
        setToast({ id: 'region-unlock', name: '🗺 New frontier unlocked!', flavor: `${where} lies open — embark when you're ready`, achieved: () => false });
      }
      prevProgress.current = prog;
    }
    const newly = checkMilestones(game, v, w); // a deed = highest priority, fires last of all
    if (newly.length > 0) {
      setToast(newly[newly.length - 1]!);
      firedHall = true;
    }
    // Tab badges (16r): flag a room whose event fired while you were on a DIFFERENT tab, so a missed
    // transient toast leaves a persistent dot. markRooms returns the same ref when nothing changes,
    // so this is a no-op re-render on a quiet tick.
    if (firedExchange || firedHall) {
      setUnseen((u) => markRooms(u, { exchange: firedExchange, hall: firedHall }, roomRef.current));
    }
  };

  useEffect(() => {
    if (toast === null) return;
    const id = setTimeout(() => setToast(null), 4_000);
    return () => clearTimeout(id);
  }, [toast]);

  // Space toggles pause/play — the idle-game standard. Never while typing.
  const lastSpeed = useRef(5);
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.code !== 'Space') return;
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(t.tagName)) return;
      e.preventDefault();
      setSpeed((s) => {
        if (s === 0) return lastSpeed.current;
        lastSpeed.current = s;
        return 0;
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (speed === 0) return;
    const id = setInterval(
      () => {
        tickWorld(game.world);
        refreshProgress(speed <= 1); // notify on resting fills only at live speed
        force();
      },
      Math.max(16, Math.round(1000 / speed)),
    );
    return () => clearInterval(id);
  }, [speed, game]);

  // Hidden tabs get throttled timers — slower than the 1 tps offline rate,
  // yet they earned no accrual on return. Make hidden ≡ closed: stamp the
  // save and pause on hide; offline-accrue on show (the chunked overlay
  // handles long absences). Sub-minute blips resume the prior speed
  // seamlessly (planOfflineProgress ignores them by design).
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const resumeSpeedRef = useRef(0);
  useEffect(() => {
    const onVis = (): void => {
      const g = gameRef.current;
      if (!g) return;
      if (document.visibilityState === 'hidden') {
        resumeSpeedRef.current = speedRef.current;
        setSpeed(0);
        saveGame(g);
        return;
      }
      beginOffline(g);
      const accrued = offlineRef.current !== null || planRef.current !== null;
      if (accrued) {
        setAwayDismissed(false);
      } else {
        setSpeed(resumeSpeedRef.current);
      }
      force();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const view = playerView(game.world, game.playerId);
  if (!view) return <p className="reject">save corrupted — clear site data and reload</p>;

  const command = (cmd: PlayerCommand): void => {
    // Recorded BEFORE applying, rejections included — replayRun applies the
    // log verbatim, so the replay re-rejects them identically.
    game.commandLog.push({ tick: game.world.tick, cmd });
    setLastResult(applyCommand(game.world, game.playerId, cmd));
    refreshProgress();
    saveGame(game);
    schedulePush();
    force();
  };
  const fastForward = (n: number): void => {
    runTicks(game.world, n);
    refreshProgress();
    saveGame(game);
    schedulePush();
    force();
  };
  const fileRef = useRef<HTMLInputElement | null>(null);
  const exportSave = (): void => {
    const blob = new Blob([exportSaveString(game)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exchange-wars-s${game.world.seed}-t${game.world.tick}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const downloadCorrupt = (): void => {
    if (corruptSave === null) return;
    const blob = new Blob([corruptSave], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exchange-wars-recovered-save.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  const importFile = (file: File): void => {
    void file.text().then((raw) => {
      const g = importSaveString(raw);
      if (!g) {
        setToast({ id: 'import-failed', name: 'Import failed', flavor: 'that was not a valid save file', achieved: () => false });
        return;
      }
      gameRef.current = g;
      beginOffline(g);
      saveGame(g);
      setSelected(g.world.items[0]?.id ?? '');
      setAwayDismissed(false);
      setSpeed(0);
      schedulePush();
      force();
    });
  };

  const shareBrag = (): void => {
    const text = bragText(game, playerWorth(game), window.location.origin, window.location.pathname, localStorage.getItem('ew-handle') ?? '');
    // Prefer the native share sheet (mobile → one tap to any app, the real viral path); the sheet IS
    // the feedback, and a user cancel rejects the promise — swallow it. Fall back to clipboard copy.
    if (navigator.share) {
      void navigator.share({ text }).catch(() => {});
      return;
    }
    const done = (): void =>
      setToast({ id: 'brag', name: 'Run summary copied', flavor: 'paste it anywhere — your stats + a challenge link', achieved: () => false });
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(text).then(done, done);
    } else {
      try {
        window.prompt('copy your run summary', text);
      } catch {
        // jsdom / ancient browsers: prompt unavailable — the toast still confirms.
      }
      done();
    }
  };
  const copyChallenge = (): void => {
    // A duel link: the seed + your current worth + handle, so it dares them to beat YOUR number (16s).
    const url = challengeLink(window.location.origin, window.location.pathname, game.world.seed, playerWorth(game), localStorage.getItem('ew-handle') ?? '');
    const done = (): void =>
      setToast({
        id: 'challenge-link',
        name: 'Challenge link copied',
        flavor: `seed ${game.world.seed} — same world, fair ground`,
        achieved: () => false,
      });
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(url).then(done, done);
    } else {
      try {
        window.prompt('copy your challenge link', url);
      } catch {
        // jsdom / ancient browsers: prompt unavailable — the toast still
        // names the seed, which is the part that matters.
      }
      done();
    }
  };

  const restart = (seed: number): void => {
    const ghost = gameRef.current ? ghostForRestart(gameRef.current, seed) : undefined;
    clearSave();
    gameRef.current = newGame(seed);
    if (ghost) gameRef.current.ghost = ghost;
    setSelected(gameRef.current.world.items[0]?.id ?? '');
    setLastResult(null);
    setSpeed(0);
    setSeedDraft(null);
    // New run → re-capture the daily record to beat and re-arm the celebration,
    // so the next firing isn't measured against a stale prior-seed best.
    incomingBest.current = undefined;
    recordCelebrated.current = false;
    schedulePush();
    force();
  };

  return (
    <div className="shell">
      <header className="masthead">
        <h1>Exchange Wars</h1>
        <div className="clock">
          <span className="label">tick</span>
          <span className="value">{game.world.tick.toLocaleString('en-US')}</span>
          <span className="label">seed</span>
          <span className="value">{game.world.seed}</span>
          {game.world.seed === dailySeed() && (
            <span
              className="dailytag"
              title="you're on today's daily — everyone racing the daily shares this exact world; your score lands on today's board"
            >
              🗓 today
            </span>
          )}
          {game.world.seed === dailySeed() && streak && streak.count >= 1 && (
            <span
              className="streaktag"
              title={`daily streak: ${streak.count} day${streak.count === 1 ? '' : 's'} in a row${
                streak.best > streak.count ? ` (best ${streak.best})` : ''
              } — play tomorrow's daily to keep it alive`}
            >
              🔥 {streak.count}
            </span>
          )}
          {game.world.seed === dailySeed() &&
            (() => {
              const v = dailyBestView(dailyBest, dailySeed(), playerWorth(game), game.startGp);
              return (
                v && (
                  <span
                    className="besttag"
                    title={`your best net worth on today's daily: ${v.best.toLocaleString('en-US')} gp${
                      v.atPeak ? ' — you’re setting a new record right now' : ' — beat it'
                    }`}
                  >
                    🏁 {fmtCompact(v.best)}
                    {v.atPeak && <span className="pct up"> ▲</span>}
                  </span>
                )
              );
            })()}
        </div>
        {(() => {
          // Market pulse: breadth (items above/below their EMA) + live events —
          // a one-glance heartbeat, visible from every room. Derived per render.
          let up = 0;
          let down = 0;
          for (const m of view.markets) {
            if (m.volume <= 0 || m.ema <= 0) continue;
            if (m.lastPrice > m.ema) up++;
            else if (m.lastPrice < m.ema) down++;
          }
          const events = (game.world.events ?? []).filter(
            (e) => e.startTick <= game.world.tick && e.endTick > game.world.tick,
          ).length;
          return (
            <div className="pulse" title="market breadth — items above / below their trend, and active events">
              <span className="label">market</span>
              <span className="pct up">▲{up}</span>
              <span className="pct down">▼{down}</span>
              {events > 0 && <span className="warn">⚡{events}</span>}
            </div>
          );
        })()}
        {streakAtRisk(streak, dailySeed()) && game.world.seed !== dailySeed() && (
          <button
            className="streaknudge"
            title="your daily streak breaks if you skip a day — load today's daily to keep it going"
            onClick={() => setSeedDraft(String(dailySeed()))}
          >
            🔥 keep your streak ({streak!.count})
          </button>
        )}
        <div className="controls">
          {SPEEDS.map((s) => (
            <button key={s} className={speed === s ? 'chip active' : 'chip'} onClick={() => setSpeed(s)}>
              {s === 0 ? '❚❚' : `${s}×`}
            </button>
          ))}
          <button className="chip" onClick={() => fastForward(1_000)}>
            +1k
          </button>
          <button className="chip" onClick={() => fastForward(10_000)}>
            +10k
          </button>
          <button className="chip" onClick={() => saveGame(game)}>
            save
          </button>
          <button className="chip" title="download your save as a file" onClick={exportSave}>
            export
          </button>
          <button className="chip" title="load a save file" onClick={() => fileRef.current?.click()}>
            import
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importFile(f);
              e.target.value = '';
            }}
          />
          <button className="chip" title="how to play" onClick={() => setHelpOpen(true)}>
            ?
          </button>
          {seedDraft === null ? (
            <>
              <button className="chip" onClick={() => setSeedDraft(String(game.world.seed + 1))}>
                new game
              </button>
              <button
                className="chip"
                title="play today's shared seed — everyone racing the daily plays the same world"
                onClick={() => setSeedDraft(String(dailySeed()))}
              >
                🗓 daily
              </button>
              <button
                className="chip"
                title="copy a link that challenges a friend to this exact seed"
                onClick={copyChallenge}
              >
                challenge link
              </button>
              <button
                className="chip"
                title="share a summary of your run (stats + a challenge link) — native share on mobile, copy on desktop"
                onClick={shareBrag}
              >
                📋 brag
              </button>
            </>
          ) : (
            <span className="seedform">
              <input
                value={seedDraft}
                onChange={(e) => setSeedDraft(e.target.value)}
                inputMode="numeric"
                aria-label="seed"
              />
              <button
                className="chip"
                onClick={() => restart(Number.isFinite(Number(seedDraft)) ? Math.trunc(Number(seedDraft)) : game.world.seed + 1)}
              >
                start
              </button>
              <button className="chip" onClick={() => setSeedDraft(null)}>
                ×
              </button>
              {(() => {
                const stakes = restartStakes(game, playerWorth(game));
                if (!stakes.atStake) return null; // a fresh run has nothing to abandon
                return (
                  <span
                    className="warn small restartwarn"
                    title="starting a new game clears this save — your current run is kept only as a ghost you can race against"
                  >
                    ⚠ wipes this run — {fmtCompact(stakes.worth)} net
                    {stakes.deeds > 0 ? ` · ${stakes.deeds} ${stakes.deeds === 1 ? 'deed' : 'deeds'}` : ''}
                  </span>
                );
              })()}
            </span>
          )}
        </div>
        <AccountBar session={session} lastSync={lastSync} />
        <div className="purse">
          <span className="value gold">{view.gp.toLocaleString('en-US')}</span>
          <span className="label">gp</span>
          <span
            className="value"
            title={`${playerWorth(game).toLocaleString('en-US')} gp — liquidation value, what the resting bids would pay for everything you hold, right now`}
          >
            {fmtCompact(playerWorth(game))}
          </span>
          <span className="label">net</span>
          {(() => {
            const delta = playerWorth(game) - game.startGp;
            return (
              <span
                className={delta >= 0 ? 'value up' : 'value down'}
                title={`${delta >= 0 ? '+' : ''}${delta.toLocaleString('en-US')} gp vs your starting stake`}
              >
                {delta >= 0 ? '+' : ''}
                {fmtCompact(delta)}
              </span>
            );
          })()}
          {(() => {
            // "Am I winning right now?" — recent net-worth slope, which the
            // cumulative delta above (dominated by long-ago gains) can't show.
            const rate = worthRate(game.worthHistory);
            if (rate === null) return null;
            return (
              <span
                className={`rate ${rate.perMin >= 0 ? 'up' : 'down'}`}
                title={`net worth ${rate.perMin >= 0 ? 'rising' : 'falling'} over the last ~${fmtDuration(
                  rate.spanTicks,
                )} — your current setup's earning rate`}
              >
                {rate.perMin >= 0 ? '▲' : '▼'} {rate.perMin >= 0 ? '+' : ''}
                {fmtCompact(rate.perMin)} gp/min
              </span>
            );
          })()}
          {game.worthHistory.length >= 2 && (
            <span className="worthspark" title="your net-worth trajectory this run">
              <Sparkline
                prices={game.worthHistory.map((h) => h.worth)}
                width={72}
                height={18}
                ariaLabel="net worth trend"
              />
            </span>
          )}
        </div>
      </header>
      {(() => {
        const active = (game.world.events ?? []).filter(
          (e) => e.startTick <= game.world.tick && e.endTick > game.world.tick,
        );
        if (active.length === 0) return null;
        const names = new Map(game.world.items.map((i) => [i.id, i.name]));
        const wikiOf = new Map(game.world.items.map((i) => [i.id, i.wikiId]));
        return (
          <div className="newsbar">
            {active.map((e) => (
              <button
                key={e.id}
                className={`event-chip ${e.kind}`}
                title="trade this event — open the item in the ticket"
                onClick={() => {
                  setSelected(e.itemId);
                  pickRoom('exchange');
                }}
              >
                ⚡ <ItemIcon id={e.itemId} wikiId={wikiOf.get(e.itemId)} size={12} className="itemicon" /> {names.get(e.itemId) ?? e.itemId}{' '}
                {EVENT_LABELS[e.kind]} · {(e.endTick - game.world.tick).toLocaleString('en-US')} left
              </button>
            ))}
          </div>
        );
      })()}
      {catchUp && (
        <div className="scrim">
          <section className="panel catchup">
            <h2>The world turns…</h2>
            <p className="dim">
              while you were away (~{fmtDuration(catchUp.total)}): {catchUp.done.toLocaleString('en-US')} /{' '}
              {catchUp.total.toLocaleString('en-US')} ticks
            </p>
            <div className="bar">
              <div className="bar-fill" style={{ width: `${Math.round((catchUp.done / catchUp.total) * 100)}%` }} />
            </div>
          </section>
        </div>
      )}
      {corruptSave !== null && (
        <div className="awaybar corruptbar" role="alert">
          ⚠ Your previous save couldn't be read, so a fresh game was started — but the old data is{' '}
          <b>preserved, not lost</b>. Download it to keep or re-import it.
          <button className="chip" onClick={downloadCorrupt}>
            download old save
          </button>
          <button
            className="chip"
            title="permanently delete the unreadable save"
            onClick={() => {
              discardCorruptSave();
              setCorruptSave(null);
            }}
          >
            discard
          </button>
          <button className="chip" title="keep it — remind me next time" onClick={() => setCorruptSave(null)}>
            ×
          </button>
        </div>
      )}
      {challenge !== null && (
        <div className="awaybar">
          {challengeTarget ? (
            <>
              ⚔ <b>{challengeTarget.handle ?? 'A challenger'}</b> dares you to beat{' '}
              <b className="up">{challengeTarget.worth.toLocaleString('en-US')} gp</b> on seed <b>{challenge}</b>. Starting
              abandons your current run.
            </>
          ) : (
            <>
              ⚔ challenged to seed <b>{challenge}</b> — same world, fair ground. Starting abandons your current run.
            </>
          )}
          <button
            className="chip"
            onClick={() => {
              restart(challenge);
              setChallenge(null);
              setChallengeTarget(null);
            }}
          >
            accept
          </button>
          <button
            className="chip"
            onClick={() => {
              setChallenge(null);
              setChallengeTarget(null);
            }}
          >
            ×
          </button>
        </div>
      )}
      {offlineRef.current &&
        !awayDismissed &&
        (() => {
          const o = offlineRef.current!;
          const delta = o.worthAfter - o.worthBefore;
          const perMin = offlineRatePerMin(delta, o.ticks);
          return (
            <div className="awaybar">
              while you were away: <b>{o.ticks.toLocaleString('en-US')}</b> ticks (~{fmtDuration(o.ticks)}) passed ·
              net worth{' '}
              <b className={delta >= 0 ? 'up' : 'down'} title={`${delta.toLocaleString('en-US')} gp`}>
                {delta >= 0 ? '+' : ''}
                {fmtCompact(delta)} gp
              </b>
              {delta > 0 && <span className="dim"> · ≈{fmtCompact(perMin)}/min</span>}
              {o.sellswordKills > 0 && (
                <span>
                  {' '}
                  · 🗡 sellsword: {o.sellswordKills.toLocaleString('en-US')} kills, {fmtCompact(o.sellswordBanked)} gp
                  banked
                </span>
              )}
              {o.topMover &&
                (() => {
                  const mv = o.topMover!;
                  const name = game.world.items.find((i) => i.id === mv.itemId)?.name ?? mv.itemId;
                  const up = mv.pct >= 0;
                  return (
                    <span className="awaymover" title="the item whose price moved most while you were away — the market doesn't sleep">
                      {' '}
                      · {up ? '📈' : '📉'}{' '}
                      <b className={up ? 'up' : 'down'}>
                        {name} {up ? '+' : ''}
                        {Math.round(mv.pct * 100)}%
                      </b>{' '}
                      ({fmtCompact(mv.startPrice)}→{fmtCompact(mv.endPrice)})
                    </span>
                  );
                })()}
              {o.heldMover &&
                o.heldMover.itemId !== o.topMover?.itemId &&
                (() => {
                  const mv = o.heldMover!;
                  const name = game.world.items.find((i) => i.id === mv.itemId)?.name ?? mv.itemId;
                  const up = mv.pct >= 0;
                  return (
                    <span className="awaymover held" title="your biggest-moving HOLDING while you were away — what your own positions did, not just the market">
                      {' '}
                      · 💼 your{' '}
                      <b className={up ? 'up' : 'down'}>
                        {name} {up ? '+' : ''}
                        {Math.round(mv.pct * 100)}%
                      </b>{' '}
                      ({fmtCompact(mv.startPrice)}→{fmtCompact(mv.endPrice)})
                    </span>
                  );
                })()}
              <button className="chip" onClick={() => setAwayDismissed(true)}>
                ×
              </button>
            </div>
          );
        })()}
      <nav className="tabs" role="tablist" aria-label="rooms">
        <button role="tab" aria-selected={room === 'exchange'} className={room === 'exchange' ? 'tab active' : 'tab'} onClick={() => pickRoom('exchange')}>
          🪙 Exchange
          {unseen['exchange'] && <span className="tabdot" title="new fills/alerts since you last looked" aria-label="new activity" />}
        </button>
        <button role="tab" aria-selected={room === 'adventure'} className={room === 'adventure' ? 'tab active' : 'tab'} onClick={() => pickRoom('adventure')}>
          ⚔ Adventure{game.world.agents[game.playerId]?.expedition ? ' ●' : ''}
        </button>
        <button role="tab" aria-selected={room === 'hall'} className={room === 'hall' ? 'tab active' : 'tab'} onClick={() => pickRoom('hall')}>
          🏰 Hall
          {unseen['hall'] && <span className="tabdot" title="a new deed since you last looked" aria-label="new activity" />}
        </button>
      </nav>
      {/* Every room stays MOUNTED (state survives switching; tests see all),
          inactive ones hide via .tabhidden — display rules beat `hidden`. */}
      <main className={room === 'exchange' ? 'board' : 'board tabhidden'}>
        <section className="middle">
          <FirstSteps game={game} view={view} onGo={pickRoom} />
          <MarketTable
            view={view}
            items={game.world.items}
            trades={game.world.trades}
            selected={selected}
            onSelect={setSelected}
            eventItems={
              new Set(
                (game.world.events ?? [])
                  .filter((e) => e.startTick <= game.world.tick && e.endTick > game.world.tick)
                  .map((e) => e.itemId),
              )
            }
            active={room === 'exchange'}
          />
          <TopFlips
            view={view}
            items={game.world.items}
            onSelect={(id, buyPrice) => {
              setSelected(id);
              onLevel('buy', buyPrice); // land in the ticket with the buy leg ready to submit
            }}
          />
          <MoversPanel view={view} items={game.world.items} onSelect={setSelected} />
          <ProfitPanel game={game} view={view} items={game.world.items} onSelect={setSelected} />
          <PositionsPanel game={game} view={view} items={game.world.items} onSelect={setSelected} onCommand={command} />
          <WatchlistPanel
            view={view}
            items={game.world.items}
            watch={watch}
            alerts={alerts}
            sellAlerts={sellAlerts}
            bandAlerts={bandAlerts}
            richAlerts={richAlerts}
            onSelect={setSelected}
            onRemove={toggleWatch}
            onSetAlert={setAlert}
            onSetSellAlert={setSellAlert}
            onToggleBandAlert={setBandAlert}
            onToggleRichAlert={setRichAlert}
          />
          <NewsLog log={game.newsLog} />
        </section>
        <section className="middle">
          <TradeTicket
            view={view}
            selected={selected}
            items={game.world.items}
            lvls={levelsOf(game.world.agents[game.playerId]?.combatXp)}
            prefill={prefill}
            active={room === 'exchange'}
            onCommand={command}
            lastResult={lastResult}
            recentPrices={game.world.trades.filter((t) => t.itemId === selected).map((t) => t.price).slice(-48)}
            position={openFromBook(game.tradeBook, selected)}
            watched={watch.includes(selected)}
            onToggleWatch={() => toggleWatch(selected)}
            eventNote={(() => {
              const e = (game.world.events ?? []).find(
                (ev) => ev.itemId === selected && ev.startTick <= game.world.tick && ev.endTick > game.world.tick,
              );
              return e
                ? `⚡ ${EVENT_LABELS[e.kind]} active — ends in ~${(e.endTick - game.world.tick).toLocaleString('en-US')} ticks`
                : null;
            })()}
          />
          <BookLadder book={game.world.books[selected]} playerId={game.playerId} onLevel={onLevel} />
        </section>
        <section className="middle">
          <PlayerPanel game={game} view={view} items={game.world.items} onCommand={command} />
          {(() => {
            const w = playerWorth(game);
            // Lazy-capture the session baseline; re-baseline on a game swap (new session).
            if (sessionBaseWorth.current === null || sessionBaseGame.current !== game) {
              sessionBaseWorth.current = w;
              sessionBaseGame.current = game;
            }
            return <WealthPanel game={game} view={view} worth={w} sessionStartWorth={sessionBaseWorth.current} />;
          })()}
          <TradeFeed
            trades={game.world.trades}
            fills={game.fills}
            items={game.world.items}
            playerId={game.playerId}
          />
          <ContractsBoard view={view} items={game.world.items} tick={game.world.tick} onCommand={command} />
        </section>
      </main>
      <main className={room === 'adventure' ? 'board' : 'board tabhidden'}>
        <section className="middle wide">
          <ExpeditionPanel
            game={game}
            view={view}
            onCommand={command}
            onRest={fastForward}
            onBuy={(id) => {
              setSelected(id);
              pickRoom('exchange');
            }}
            onToast={(name, flavor) => setToast({ id: 'expedition', name, flavor, achieved: () => false })}
            onDelveEnd={(record) => {
              // A new best haul? Compare to the prior dives BEFORE this one is appended.
              const newBest = isNewBestHaul(game.delves, record);
              const log = (game.delves ??= []);
              log.push(record);
              if (log.length > DELVE_LOG_CAP) log.splice(0, log.length - DELVE_LOG_CAP);
              if (newBest) {
                const where = REGIONS[regionIndex(record.regionId)]?.name ?? record.regionId;
                setToast({
                  id: 'besthaul',
                  name: '🏆 New best haul!',
                  flavor: `${record.lootGp.toLocaleString('en-US')} gp banked from ${where}`,
                  achieved: () => false,
                });
              }
              // Survival-streak milestone (16g): a clean extraction reaching 5/10/25/… in a row.
              // Computed AFTER the append; a death resets the streak to 0, so it can't fire one. Last
              // toast in this handler → the rarer milestone wins the slot if a best-haul also fired.
              const streakNow = diveStreak(game.delves).current;
              if (isStreakMilestone(streakNow)) {
                setToast({
                  id: 'streak-milestone',
                  name: `🔥 ${streakNow}-dive survival streak!`,
                  flavor: `${streakNow} clean extractions in a row — don't break it now`,
                  achieved: () => false,
                });
              }
              saveGame(game);
              force();
            }}
          />
        </section>
        <section className="middle">
          <EmbarkPanel game={game} view={view} items={game.world.items} onCommand={command} onRest={fastForward} regionPick={regionPick} active={room === 'adventure'} />
          <BountyBoard game={game} onCommand={command} />
          <MilestonesPanel unlocked={game.milestones} game={game} view={view} worth={playerWorth(game)} />
        </section>
      </main>
      <main className={room === 'hall' ? 'board' : 'board tabhidden'}>
        <section className="middle">
          <BragCard game={game} worth={playerWorth(game)} handle={localStorage.getItem('ew-handle') ?? ''} />
          <UpgradeShop view={view} items={game.world.items} onCommand={command} />
          <RecordsPanel game={game} />
          <ConquestPanel game={game} />
          <DelvePanel game={game} onPick={jumpToRegion} />
          <AlmanacPanel game={game} />
        </section>
        <section className="middle">
          <WorthChart
            history={game.worthHistory}
            startGp={game.startGp}
            ghost={game.ghost && game.ghost.seed === game.world.seed ? game.ghost.history : null}
            milestones={game.milestones
              .filter((id) => game.milestoneTicks?.[id] !== undefined)
              .map((id) => ({ tick: game.milestoneTicks![id]!, name: MILESTONES.find((m) => m.id === id)?.name ?? id }))}
          />
        </section>
        <section className="middle">
          <LeaderboardPanel
            game={game}
            session={session}
            onToast={(name, flavor) => setToast({ id: 'sprint', name, flavor, achieved: () => false })}
          />
        </section>
      </main>
      {helpOpen && <HelpOverlay onClose={closeHelp} />}
      {toast && (
        <div className="toast" onClick={() => setToast(null)}>
          <span className="mine">◆</span> <b>{toast.name}</b>
          <span className="dim"> — {toast.flavor}</span>
        </div>
      )}
      <footer className="footnote">
        deterministic world · automation keeps working through fast-forward · art direction provisional
      </footer>
    </div>
  );
}
