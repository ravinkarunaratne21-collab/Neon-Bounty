import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { ChiptuneAudio } from './audio';
import { GameEngine, STAGES } from './game';
import type { Control, GameSnapshot, RunResult } from './game';
import { CLEAR_LINES, LOSS_LINES } from './stages';

interface HighScore {
  id: number;
  name: string;
  score: number;
  stage: number;
  victory: boolean;
}

const STORAGE_KEY = 'neon-bounty-highscores-v1';
const PROGRESS_KEY = 'neon-bounty-progress-v1';
const INITIAL_SNAPSHOT: GameSnapshot = {
  status: 'start', score: 0, health: 6, maxHealth: 6, level: 0,
  progress: 0, bossActive: false, bossHealth: 15, bossMaxHealth: 15, combo: 0, elapsed: 0, enemiesLeft: 8,
  sandevCharge: 0, sandevActive: false, levelCode: null,
};

interface RunProgress {
  clearedMax: number;
  codes: Record<number, string>;
}

function loadProgress(): RunProgress {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PROGRESS_KEY) || 'null');
    if (typeof parsed === 'object' && parsed !== null && typeof (parsed as RunProgress).clearedMax === 'number') {
      const data = parsed as RunProgress;
      return { clearedMax: Math.max(1, Math.min(10, data.clearedMax)), codes: data.codes ?? {} };
    }
  } catch {
    // Corrupt or unavailable storage falls back to a fresh run.
  }
  return { clearedMax: 1, codes: {} };
}

function saveProgress(data: RunProgress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
  } catch {
    // Private browsing can block storage; progress just won't persist.
  }
}

// A proper human skull: rounded cranium, hollow eye sockets, nasal cavity, teeth and jaw.
const SKULL_ROWS = [
  '...############...',
  '..##############..',
  '.################.',
  '.################.',
  '##################',
  '##################',
  '##################',
  '.################.',
  '.##.####..####.##.',
  '.##.oooo..oooo.##.',
  '.##.oooo..oooo.##.',
  '.###.oooo.oooo.###',
  '#####.oo..oo.#####',
  '######..nn..######',
  '#####....nn....###',
  '##################',
  '.##############.##',
  '.##.t.t.t.t.t.##..',
  '.##.t.t.t.t.t.##..',
  '..###.t.t.t.###...',
  '...#........#.....',
];

function FlatlineSkull() {
  return (
    <svg className="flatline-skull" viewBox="0 0 18 21" shapeRendering="crispEdges" role="img" aria-label="Red human skull">
      <defs>
        <filter id="skull-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <g filter="url(#skull-glow)">
        {SKULL_ROWS.flatMap((row, y) => row.split('').map((cell, x) => {
          if (cell === '.') return null;
          const dark = cell === 'o' || cell === 'n';
          return <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={dark ? '#3d020c' : cell === 't' ? '#ffd9dd' : '#ff2b47'} />;
        }))}
      </g>
    </svg>
  );
}

const formatScore = (score: number) => String(score).padStart(6, '0');

function loadScores(): HighScore[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is HighScore =>
      typeof entry === 'object' && entry !== null && typeof entry.score === 'number' && typeof entry.name === 'string'
    ).sort((a, b) => b.score - a.score).slice(0, 5);
  } catch {
    return [];
  }
}

function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      {muted ? <path d="m17 9 5 6m0-6-5 6" /> : <><path d="M17 9a4 4 0 0 1 0 6" /><path d="M19 6a8 8 0 0 1 0 12" /></>}
    </svg>
  );
}

function ControlIcon({ kind }: { kind: Control }) {
  if (kind === 'shoot') {
    return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><circle cx="16" cy="16" r="8" /><circle cx="16" cy="16" r="2.5" fill="currentColor" stroke="none" /><path d="M16 2v6m0 16v6M2 16h6m16 0h6" /></svg>;
  }
  if (kind === 'jump') {
    return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true"><path d="m7 21 9-10 9 10" /><path d="m7 28 9-10 9 10" /></svg>;
  }
  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true"><path d={kind === 'left' ? 'm21 6-11 10 11 10' : 'M11 6 22 16 11 26'} /></svg>;
}

function Leaderboard({ scores, compact = false }: { scores: HighScore[]; compact?: boolean }) {
  return (
    <div className={`leaderboard ${compact ? 'leaderboard--compact' : ''}`}>
      <div className="leaderboard-title"><span>LOCAL TOP RUNS</span><span>SCORE</span></div>
      {scores.length === 0 ? (
        <div className="leaderboard-empty"><span>01</span><span>NO RUNS LOGGED YET</span><span>------</span></div>
      ) : scores.slice(0, compact ? 3 : 5).map((entry, index) => (
        <div className="leaderboard-row" key={entry.id}>
          <span className="rank">{String(index + 1).padStart(2, '0')}</span>
          <span className="runner-name">{entry.name}</span>
          <span className="runner-score">{formatScore(entry.score)}</span>
        </div>
      ))}
    </div>
  );
}

const KEY_MAP: Record<string, Control> = {
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  KeyW: 'jump', ArrowUp: 'jump', Space: 'jump',
  KeyJ: 'shoot', KeyK: 'shoot', KeyX: 'shoot', KeyF: 'shoot', ControlLeft: 'shoot',
};

const emptyControls = () => ({ left: false, right: false, jump: false, shoot: false });
const makeSources = (): Record<Control, Set<string>> => ({ left: new Set(), right: new Set(), jump: new Set(), shoot: new Set() });

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const audioRef = useRef<ChiptuneAudio | null>(null);
  const inputSources = useRef(makeSources());
  const callsignRef = useRef('GHOST');
  const [snapshot, setSnapshot] = useState<GameSnapshot>(INITIAL_SNAPSHOT);
  const [scores, setScores] = useState<HighScore[]>(loadScores);
  const [callsign, setCallsign] = useState('GHOST');
  const [soundOn, setSoundOn] = useState(true);
  const [activeControls, setActiveControls] = useState(emptyControls);
  const [progress, setProgress] = useState<RunProgress>(loadProgress);
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [codeTarget, setCodeTarget] = useState<number | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState(false);
  const selectedLevelRef = useRef(0);
  selectedLevelRef.current = selectedLevel;
  callsignRef.current = callsign;

  // When a sector is cleared, bank the access code for the next one.
  useEffect(() => {
    if (snapshot.status === 'transition' && snapshot.levelCode) {
      const next = snapshot.level + 1;
      const code = snapshot.levelCode;
      setProgress((prev) => {
        if (prev.codes[next] === code && prev.clearedMax >= next + 1) return prev;
        const updated: RunProgress = { clearedMax: Math.max(prev.clearedMax, next + 1), codes: { ...prev.codes, [next]: code } };
        saveProgress(updated);
        return updated;
      });
    }
    if (snapshot.status === 'victory') {
      setProgress((prev) => {
        if (prev.clearedMax >= 10) return prev;
        const updated: RunProgress = { ...prev, clearedMax: 10 };
        saveProgress(updated);
        return updated;
      });
    }
  }, [snapshot.status, snapshot.levelCode, snapshot.level]);

  useEffect(() => {
    if (!canvasRef.current || !stageRef.current) return;
    const audio = new ChiptuneAudio();
    audioRef.current = audio;
    const engine = new GameEngine(canvasRef.current, audio, setSnapshot, (result: RunResult) => {
      const entry: HighScore = {
        id: Date.now() + Math.random(), name: callsignRef.current.trim().toUpperCase() || 'GHOST',
        score: result.score, stage: result.level + 1, victory: result.victory,
      };
      const updated = [...loadScores(), entry].sort((a, b) => b.score - a.score).slice(0, 5);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* Private browsing can block storage. */ }
      setScores(updated);
    });
    engineRef.current = engine;
    const observer = new ResizeObserver(() => engine.resize());
    observer.observe(stageRef.current);
    return () => {
      observer.disconnect();
      engine.destroy();
      audio.destroy();
      engineRef.current = null;
      audioRef.current = null;
    };
  }, []);

  const setInput = useCallback((control: Control, source: string, pressed: boolean) => {
    const sources = inputSources.current[control];
    if (pressed) sources.add(source);
    else sources.delete(source);
    const active = sources.size > 0;
    engineRef.current?.setControl(control, active);
    setActiveControls((previous) => previous[control] === active ? previous : { ...previous, [control]: active });
  }, []);

  const releaseAll = useCallback(() => {
    (Object.keys(inputSources.current) as Control[]).forEach((control) => {
      inputSources.current[control].clear();
      engineRef.current?.setControl(control, false);
    });
    setActiveControls(emptyControls());
  }, []);

  const startRun = useCallback((level?: number) => {
    releaseAll();
    engineRef.current?.start(level ?? selectedLevelRef.current);
  }, [releaseAll]);

  const tryUnlock = useCallback(() => {
    if (codeTarget === null) return;
    if (codeInput === progress.codes[codeTarget]) {
      setProgress((prev) => {
        const updated: RunProgress = { clearedMax: Math.max(prev.clearedMax, codeTarget + 1), codes: prev.codes };
        saveProgress(updated);
        return updated;
      });
      setSelectedLevel(codeTarget);
      setCodeTarget(null);
      setCodeInput('');
      setCodeError(false);
    } else {
      setCodeError(true);
    }
  }, [codeTarget, codeInput, progress.codes]);

  const togglePause = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (snapshot.status === 'paused') engine.resume();
    else if (snapshot.status === 'playing') {
      releaseAll();
      engine.pause();
    }
  }, [snapshot.status, releaseAll]);

  const toggleSound = useCallback(() => {
    const enabled = audioRef.current?.toggle();
    if (enabled !== undefined) setSoundOn(enabled);
  }, []);


  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) {
        // Only the callsign field starts a run on Enter; the access-code field keeps focus.
        if (event.code === 'Enter' && event.target.getAttribute('aria-label')?.includes('callsign')) {
          event.preventDefault();
          event.target.blur();
          startRun();
        }
        return;
      }
      const control = KEY_MAP[event.code];
      if (control) { event.preventDefault(); setInput(control, `key-${event.code}`, true); return; }
      if (event.code === 'Escape' || event.code === 'KeyP') { event.preventDefault(); togglePause(); }
      else if (event.code === 'Enter' && ['start', 'gameover', 'victory'].includes(snapshot.status)) { event.preventDefault(); startRun(); }
      else if (event.code === 'Enter' && snapshot.status === 'paused') { event.preventDefault(); togglePause(); }
      else if (event.code === 'KeyR') { event.preventDefault(); startRun(); }
      else if (event.code === 'KeyL') { event.preventDefault(); engineRef.current?.activateSandevistan(); }
      else if (event.code === 'KeyM') { event.preventDefault(); toggleSound(); }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const control = KEY_MAP[event.code];
      if (control) { event.preventDefault(); setInput(control, `key-${event.code}`, false); }
    };
    const onBlur = () => { releaseAll(); engineRef.current?.pause(); };
    const onVisibilityChange = () => { if (document.hidden) onBlur(); };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [setInput, releaseAll, startRun, togglePause, toggleSound, snapshot.status]);

  const pointerDown = (control: Control) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setInput(control, `pointer-${event.pointerId}`, true);
  };
  const pointerUp = (control: Control) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setInput(control, `pointer-${event.pointerId}`, false);
  };

  const stage = STAGES[snapshot.level];
  const inRun = snapshot.status === 'playing' || snapshot.status === 'paused' || snapshot.status === 'transition';

  return (
    <main className="app-page">
      <div className="ambient-grid" aria-hidden="true" />
      <div className="arcade-layout">
        <aside className="editorial" aria-label="Game introduction">
          <div className="editorial-top"><span className="editorial-symbol"><i /><i /><i /><i /></span><span>AFTERDARK ARCADE</span><span className="editorial-edition">// VOL. 01</span></div>
          <div className="editorial-center">
            <div className="editorial-overline"><span className="tiny-square" /> A NEW CONTRACT IS LIVE</div>
            <h1>NEON<span>BOUNTY<span className="title-dot">.</span></span></h1>
            <div className="editorial-rule"><span /></div>
            <p>One bounty hunter. Ten districts.<br />A city that shoots back.</p>
            <div className="editorial-cta-note"><span className="cta-arrow">&gt;</span> START THE HUNT ON THE SCREEN</div>
          </div>
          <div className="editorial-bottom">
            <div className="legend-heading"><span>THE CONTROLS</span><span>01 / 03</span></div>
            <div className="legend-line"><span>MOVE</span><div><kbd>A</kbd><kbd>D</kbd><small>OR ARROWS</small></div></div>
            <div className="legend-line"><span>JUMP</span><div><kbd>SPACE</kbd><small>OR W / UP</small></div></div>
            <div className="legend-line"><span>SHOOT</span><div><kbd>J</kbd><small>OR F / X</small></div></div>
            <div className="legend-line"><span>SANDEV</span><div><kbd>L</kbd><small>OR TAP CORE</small></div></div>
            <div className="editorial-foot"><span>BEST RUN <strong>{formatScore(scores[0]?.score ?? 0)}</strong></span><span>PRESS P TO PAUSE</span></div>
          </div>
        </aside>

        <section className="game-frame" aria-label="Neon Bounty game">
          <div className="game-stage" ref={stageRef}>
            <canvas ref={canvasRef} aria-label="Side-scrolling cyberpunk bounty hunter game" />
            <div className="screen-texture" aria-hidden="true" />

            <header className="game-hud">
              <div className="hud-topline">
                <div className="hud-brand"><span className="brand-cross">+</span><span>NB<span className="brand-slash">//</span>79</span><span className="hud-online">ONLINE</span></div>
                <div className="hud-actions">
                  <button type="button" className="hud-icon-button" onClick={toggleSound} aria-label={soundOn ? 'Mute sound' : 'Unmute sound'} title={soundOn ? 'Mute sound (M)' : 'Unmute sound (M)'}><SoundIcon muted={!soundOn} /></button>
                  <button type="button" className="hud-icon-button" onClick={togglePause} disabled={!inRun || snapshot.status === 'transition'} aria-label={snapshot.status === 'paused' ? 'Resume game' : 'Pause game'} title="Pause (P)">
                    {snapshot.status === 'paused' ? <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m8 5 11 7-11 7V5Z" /></svg> : <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="5" width="5" height="14" /><rect x="14" y="5" width="5" height="14" /></svg>}
                  </button>
                </div>
              </div>
              {inRun && <>
                <div className="hud-readout">
                  <div className="hud-location"><span>SECTOR {String(snapshot.level + 1).padStart(2, '0')} / {STAGES.length} — {stage.district}</span><strong>{stage.name}</strong></div>
                  <div className="hud-score"><span>SCORE</span><strong>{formatScore(snapshot.score)}</strong></div>
                </div>
                <div className="hud-vitals"><span>VITALS</span><div className="health-segments" aria-label={`${snapshot.health} of ${snapshot.maxHealth} health`}>
                  {Array.from({ length: snapshot.maxHealth }, (_, index) => <i key={index} className={index < snapshot.health ? 'filled' : ''} />)}
                </div><span className="hud-combo">{snapshot.combo > 1 ? `x${snapshot.combo} COMBO` : `HOSTILES ${String(snapshot.enemiesLeft).padStart(2, '0')}`}</span></div>
                <div className="level-progress"><div style={{ width: `${Math.max(2, snapshot.progress * 100)}%` }} /></div>
                {snapshot.bossActive && <div className="boss-hud"><div><span>TARGET LOCKED</span><strong>{stage.boss}</strong></div><div className="boss-health"><i style={{ width: `${snapshot.bossHealth / snapshot.bossMaxHealth * 100}%` }} /></div></div>}
              </>}
            </header>

            {snapshot.status === 'playing' && snapshot.elapsed < 4 && <div className="opening-hint">MOVE RIGHT <span> / </span> SHOOT TO SURVIVE <b>&gt;&gt;</b></div>}

            {snapshot.status === 'start' && <div className="game-overlay overlay-start">
              <div className="overlay-content">
                <div className="overlay-kicker"><span className="pulse-dot" /> SYSTEM READY // 2079</div>
                <h2 className="overlay-title">NEON<span>BOUNTY<span className="title-dot">.</span></span></h2>
                <p className="overlay-description">Hunt the city. Outrun the night.</p>
                <p className="overlay-quote">"I'll live my life between the sun and the moon."</p>
                <label className="callsign-field"><span>YOUR CALLSIGN</span><input value={callsign} maxLength={8} spellCheck={false} onChange={(event) => setCallsign(event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))} aria-label="Your callsign for the high-score table" /></label>
                <button type="button" className="primary-button" onClick={() => startRun()}><span>START CONTRACT</span><span className="button-arrow">&gt;</span></button>
                <div className="level-select">
                  <div className="level-select-head"><span>SECTOR SELECT</span><span>10</span></div>
                  <div className="level-chips">
                    {STAGES.map((s, i) => {
                      const unlocked = i < progress.clearedMax;
                      return (
                        <button
                          key={s.name}
                          type="button"
                          className={`level-chip ${unlocked ? 'is-open' : ''} ${i === selectedLevel ? 'is-selected' : ''} ${codeTarget === i ? 'is-target' : ''}`}
                          onClick={() => {
                            if (unlocked) {
                              setSelectedLevel(i);
                              setCodeTarget(null);
                              setCodeInput('');
                              setCodeError(false);
                            } else {
                              setCodeTarget(i);
                              setCodeInput('');
                              setCodeError(false);
                            }
                          }}
                          aria-label={unlocked ? `Play sector ${i + 1}: ${s.name}` : `Sector ${i + 1} locked — enter its access code`}
                          title={s.name}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </button>
                      );
                    })}
                  </div>
                  {codeTarget !== null && (
                    <div className={`code-row ${codeError ? 'is-error' : ''}`}>
                      <span>SECTOR {String(codeTarget + 1).padStart(2, '0')} ACCESS CODE</span>
                      <input
                        value={codeInput}
                        maxLength={4}
                        inputMode="numeric"
                        spellCheck={false}
                        aria-label="4 digit access code"
                        placeholder="····"
                        onChange={(event) => {
                          setCodeInput(event.target.value.replace(/\D/g, ''));
                          setCodeError(false);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') tryUnlock();
                          event.stopPropagation();
                        }}
                      />
                      <button type="button" className="code-unlock" onClick={tryUnlock}>UNLOCK</button>
                      <button type="button" className="code-cancel" onClick={() => { setCodeTarget(null); setCodeInput(''); setCodeError(false); }} aria-label="Cancel code entry">X</button>
                    </div>
                  )}
                  {codeError && <div className="code-error">INVALID CODE — CHECK THE ROLLOUT</div>}
                </div>
                <div className="start-shortcut">PRESS ENTER OR TAP TO PLAY</div>
              </div>
              <Leaderboard scores={scores} compact />
            </div>}

            {snapshot.status === 'paused' && <div className="game-overlay overlay-end overlay-paused">
              <div className="overlay-kicker">// SIGNAL INTERRUPTED</div>
              <h2 className="state-title">PAUSED<span>.</span></h2>
              <p className="state-copy">Catch your breath. The city can wait.</p>
              <button type="button" className="primary-button" onClick={togglePause}><span>RESUME RUN</span><span className="button-arrow">&gt;</span></button>
              <button type="button" className="text-button" onClick={() => startRun()}>RESTART CONTRACT</button>
              <button type="button" className="text-button" onClick={() => engineRef.current?.toMenu()}>MAIN MENU</button>
              <div className="state-shortcut">P / ESC TO RESUME</div>
            </div>}

            {snapshot.status === 'transition' && <div className="game-overlay overlay-transition">
              <div className="overlay-kicker">// TARGET ELIMINATED</div>
              <h2 className="state-title">CONTRACT<br /><span>CLEARED.</span></h2>
              <p className="state-copy state-copy--big">{CLEAR_LINES[snapshot.level % CLEAR_LINES.length]}</p>
              {snapshot.levelCode && <p className="state-copy state-copy--code">ACCESS CODE // SECTOR {String(snapshot.level + 2).padStart(2, '0')}<strong>{snapshot.levelCode}</strong></p>}
              <p className="state-copy">{snapshot.level < STAGES.length - 1 ? `NEXT STOP: ${STAGES[snapshot.level + 1].name}` : 'THE CITY IS YOURS.'}</p>
            </div>}

            {snapshot.status === 'gameover' && <div className="game-overlay overlay-end overlay-results overlay-flatline">
              <div className="overlay-kicker overlay-kicker--danger">// VITAL SIGNS LOST</div>
              <div className="flatline-banner"><FlatlineSkull /><h2 className="flatline-title">FLATLINED</h2></div>
              <div className="flatline-line" aria-hidden="true" />
              <p className="state-copy">{LOSS_LINES[snapshot.score % LOSS_LINES.length]}</p>
              <div className="result-score"><span>FINAL SCORE</span><strong>{formatScore(snapshot.score)}</strong><small>SECTOR {String(snapshot.level + 1).padStart(2, '0')} / {STAGES.length}</small></div>
              <button type="button" className="primary-button primary-button--danger" onClick={() => startRun()}><span>RUN IT BACK</span><span className="button-arrow">&gt;</span></button>
              <div className="state-shortcut">PRESS R OR ENTER TO RESTART</div>
              <Leaderboard scores={scores} />
            </div>}

            {snapshot.status === 'victory' && <div className="game-overlay overlay-end overlay-results">
              <div className="overlay-kicker">// ALL CONTRACTS COMPLETE</div>
              <h2 className="state-title">NIGHT CITY<br /><span>LEGEND.</span></h2>
              <p className="state-copy state-copy--big">Congratulations, {callsign || 'GHOST'} — you are a Night City Legend.</p>
              <p className="state-copy">Ten districts. Ten targets. Zero witnesses.</p>
              <div className="result-score"><span>FINAL SCORE</span><strong>{formatScore(snapshot.score)}</strong><small>SECTOR {String(snapshot.level + 1).padStart(2, '0')} / {STAGES.length}</small></div>
              <button type="button" className="primary-button" onClick={() => startRun()}><span>RUN IT BACK</span><span className="button-arrow">&gt;</span></button>
              <div className="state-shortcut">PRESS R OR ENTER TO RESTART</div>
              <Leaderboard scores={scores} />
            </div>}
          </div>

          <div className="control-deck" onContextMenu={(event) => event.preventDefault()}>
            <div className="control-group control-group--movement"><div className="deck-label"><span>01</span> MOVEMENT</div><div className="control-buttons">
              {(['left', 'right'] as Control[]).map((control) => <button key={control} type="button" className={`pad-key pad-key--move ${activeControls[control] ? 'is-pressed' : ''}`} aria-label={`Walk ${control}`} onPointerDown={pointerDown(control)} onPointerUp={pointerUp(control)} onPointerCancel={pointerUp(control)} onLostPointerCapture={pointerUp(control)}><ControlIcon kind={control} /><span>{control === 'left' ? 'LEFT' : 'RIGHT'}</span></button>)}
            </div></div>
            <div className="control-group control-group--sand">
              <div className="deck-label"><span>03</span> SANDEVISTAN</div>
              <div className="sandev-wrap">
                <button
                  type="button"
                  className={`sandev ${snapshot.sandevCharge >= 100 && !snapshot.sandevActive ? 'sandev--ready' : ''} ${snapshot.sandevActive ? 'sandev--active' : ''}`}
                  style={{ background: `conic-gradient(${snapshot.sandevActive ? '#7afbf1' : snapshot.sandevCharge >= 100 ? '#7afbf1' : '#2c4a5a'} ${snapshot.sandevCharge * 3.6}deg, rgba(14,28,40,.9) 0deg)` }}
                  onClick={() => engineRef.current?.activateSandevistan()}
                  aria-label={`Sandevistan: ${snapshot.sandevCharge}% charged. Time-slow burst with 10x bullet damage.`}
                  title="Time-slow burst — bullets hit 10x while it runs"
                >
                  <span className="sandev-core"><strong>SAND</strong><small>x10</small></span>
                </button>
              </div>
            </div>
            <div className="control-group control-group--combat"><div className="deck-label"><span>02</span> ACTION</div><div className="control-buttons">
              {(['jump', 'shoot'] as Control[]).map((control) => <button key={control} type="button" className={`pad-key pad-key--${control} ${activeControls[control] ? 'is-pressed' : ''}`} aria-label={control === 'jump' ? 'Jump' : 'Shoot'} onPointerDown={pointerDown(control)} onPointerUp={pointerUp(control)} onPointerCancel={pointerUp(control)} onLostPointerCapture={pointerUp(control)}><ControlIcon kind={control} /><span>{control === 'shoot' ? 'FIRE' : 'JUMP'}</span></button>)}
            </div></div>
          </div>
        </section>
      </div>
      <div className="page-corner page-corner--left" aria-hidden="true">EST. 2079 / MEGACITY FREQUENCY</div>
      <div className="page-corner page-corner--right" aria-hidden="true">INSERT COURAGE // NOT COINS</div>
    </main>
  );
}