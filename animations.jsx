// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// animations.jsx
// Reusable animation starter: Stage, Timeline, Sprite, easing helpers.
// Exports (to window): Stage, Sprite, PlaybackBar, TextSprite, ImageSprite, RectSprite,
//   useTime, useTimeline, useSprite, Easing, interpolate, animate, clamp.
//
// Usage (in an HTML file that loads React + Babel):
//
//   <Stage width={1280} height={720} duration={10} background="#f6f4ef">
//     <MyScene />
//   </Stage>
//
// <Stage> auto-scales to the viewport and provides the scrubber, play/pause,
// ←/→ seek, space, and 0-to-reset controls, and persists the playhead.
// Inside <Stage>, any child can call useTime() to read the current
// playhead (seconds). Or wrap content in <Sprite start={1} end={4}>...</Sprite>
// to only render during that window -- children receive a `localTime` and
// `progress` via the useSprite() hook. Use Easing + interpolate()/animate()
// for tweens; TextSprite / ImageSprite / RectSprite have built-in entry/exit.
// Build YOUR scenes by composing Sprites inside a Stage.
/* END USAGE */
// ─────────────────────────────────────────────────────────────────────────────

// ── Easing functions (hand-rolled, Popmotion-style) ─────────────────────────
// All easings take t ∈ [0,1] and return eased t ∈ [0,1] (may overshoot for back/elastic).
const Easing = {
  linear: (t) => t,

  // Quad
  easeInQuad:    (t) => t * t,
  easeOutQuad:   (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  // Cubic
  easeInCubic:    (t) => t * t * t,
  easeOutCubic:   (t) => (--t) * t * t + 1,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),

  // Quart
  easeInQuart:    (t) => t * t * t * t,
  easeOutQuart:   (t) => 1 - (--t) * t * t * t,
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t),

  // Expo
  easeInExpo:  (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) return 0.5 * Math.pow(2, 20 * t - 10);
    return 1 - 0.5 * Math.pow(2, -20 * t + 10);
  },

  // Sine
  easeInSine:    (t) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine:   (t) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,

  // Back (overshoot)
  easeOutBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeInBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  easeInOutBack: (t) => {
    const c1 = 1.70158, c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },

  // Elastic
  easeOutElastic: (t) => {
    const c4 = (2 * Math.PI) / 3;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};

// ── Core interpolation helpers ──────────────────────────────────────────────

// Clamp a value to [min, max]
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// interpolate([0, 0.5, 1], [0, 100, 50], ease?) -> fn(t)
// Popmotion-style: linearly maps t across input keyframes to output values,
// with optional easing per segment (single fn or array of fns).
function interpolate(input, output, ease = Easing.linear) {
  return (t) => {
    if (t <= input[0]) return output[0];
    if (t >= input[input.length - 1]) return output[output.length - 1];
    for (let i = 0; i < input.length - 1; i++) {
      if (t >= input[i] && t <= input[i + 1]) {
        const span = input[i + 1] - input[i];
        const local = span === 0 ? 0 : (t - input[i]) / span;
        const easeFn = Array.isArray(ease) ? (ease[i] || Easing.linear) : ease;
        const eased = easeFn(local);
        return output[i] + (output[i + 1] - output[i]) * eased;
      }
    }
    return output[output.length - 1];
  };
}

// animate({from, to, start, end, ease})(t) — simpler single-segment tween.
// Returns `from` before `start`, `to` after `end`.
function animate({ from = 0, to = 1, start = 0, end = 1, ease = Easing.easeInOutCubic }) {
  return (t) => {
    if (t <= start) return from;
    if (t >= end) return to;
    const local = (t - start) / (end - start);
    return from + (to - from) * ease(local);
  };
}

// ── Timeline context ────────────────────────────────────────────────────────

const TimelineContext = React.createContext({ time: 0, duration: 10, playing: false });

const useTime = () => React.useContext(TimelineContext).time;
const useTimeline = () => React.useContext(TimelineContext);

// ── Sprite ──────────────────────────────────────────────────────────────────
// Renders children only when the playhead is inside [start, end]. Provides
// a sub-context with `localTime` (seconds since start) and `progress` (0..1).
//
//   <Sprite start={2} end={5}>
//     {({ localTime, progress }) => <Thing x={progress * 100} />}
//   </Sprite>
//
// Or as a plain wrapper — children can call useSprite() themselves.

const SpriteContext = React.createContext({ localTime: 0, progress: 0, duration: 0 });
const useSprite = () => React.useContext(SpriteContext);

function Sprite({ start = 0, end = Infinity, children, keepMounted = false }) {
  const { time } = useTimeline();
  const visible = time >= start && time <= end;
  if (!visible && !keepMounted) return null;

  const duration = end - start;
  const localTime = Math.max(0, time - start);
  const progress = duration > 0 && isFinite(duration)
    ? clamp(localTime / duration, 0, 1)
    : 0;

  const value = { localTime, progress, duration, visible };

  return (
    <SpriteContext.Provider value={value}>
      {typeof children === 'function' ? children(value) : children}
    </SpriteContext.Provider>
  );
}

// ── Sample sprite components ────────────────────────────────────────────────

// TextSprite: fades/slides text in on entry, holds, then fades out on exit.
// Props: text, x, y, size, color, font, entryDur, exitDur, align
function TextSprite({
  text,
  x = 0, y = 0,
  size = 48,
  color = '#111',
  font = 'Inter, system-ui, sans-serif',
  weight = 600,
  entryDur = 0.45,
  exitDur = 0.35,
  entryEase = Easing.easeOutBack,
  exitEase = Easing.easeInCubic,
  align = 'left',
  letterSpacing = '-0.01em',
}) {
  const { localTime, duration } = useSprite();
  const exitStart = Math.max(0, duration - exitDur);

  let opacity = 1;
  let ty = 0;

  if (localTime < entryDur) {
    const t = entryEase(clamp(localTime / entryDur, 0, 1));
    opacity = t;
    ty = (1 - t) * 16;
  } else if (localTime > exitStart) {
    const t = exitEase(clamp((localTime - exitStart) / exitDur, 0, 1));
    opacity = 1 - t;
    ty = -t * 8;
  }

  const translateX = align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0';

  return (
    <div style={{
      position: 'absolute',
      left: x, top: y,
      transform: `translate(${translateX}, ${ty}px)`,
      opacity,
      fontFamily: font,
      fontSize: size,
      fontWeight: weight,
      color,
      letterSpacing,
      whiteSpace: 'pre',
      lineHeight: 1.1,
      willChange: 'transform, opacity',
    }}>
      {text}
    </div>
  );
}

// ImageSprite: scales + fades in; optional Ken Burns drift during hold.
function ImageSprite({
  src,
  x = 0, y = 0,
  width = 400, height = 300,
  entryDur = 0.6,
  exitDur = 0.4,
  kenBurns = false,
  kenBurnsScale = 1.08,
  radius = 12,
  fit = 'cover',
  placeholder = null, // {label: string} for striped placeholder
}) {
  const { localTime, duration } = useSprite();
  const exitStart = Math.max(0, duration - exitDur);

  let opacity = 1;
  let scale = 1;

  if (localTime < entryDur) {
    const t = Easing.easeOutCubic(clamp(localTime / entryDur, 0, 1));
    opacity = t;
    scale = 0.96 + 0.04 * t;
  } else if (localTime > exitStart) {
    const t = Easing.easeInCubic(clamp((localTime - exitStart) / exitDur, 0, 1));
    opacity = 1 - t;
    scale = (kenBurns ? kenBurnsScale : 1) + 0.02 * t;
  } else if (kenBurns) {
    const holdSpan = exitStart - entryDur;
    const holdT = holdSpan > 0 ? (localTime - entryDur) / holdSpan : 0;
    scale = 1 + (kenBurnsScale - 1) * holdT;
  }

  const content = placeholder ? (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'repeating-linear-gradient(135deg, #e9e6df 0 10px, #dcd8cf 10px 20px)',
      color: '#6b6458',
      fontFamily: 'JetBrains Mono, ui-monospace, monospace',
      fontSize: 13,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
    }}>
      {placeholder.label || 'image'}
    </div>
  ) : (
    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: fit, display: 'block' }} />
  );

  return (
    <div style={{
      position: 'absolute',
      left: x, top: y,
      width, height,
      opacity,
      transform: `scale(${scale})`,
      transformOrigin: 'center',
      borderRadius: radius,
      overflow: 'hidden',
      willChange: 'transform, opacity',
    }}>
      {content}
    </div>
  );
}

// RectSprite: simple rectangle that animates position/size/color via props.
// Useful demo primitive — takes a `render` fn for per-frame customization.
function RectSprite({
  x = 0, y = 0,
  width = 100, height = 100,
  color = '#111',
  radius = 8,
  entryDur = 0.4,
  exitDur = 0.3,
  render, // optional: (ctx) => style overrides
}) {
  const spriteCtx = useSprite();
  const { localTime, duration } = spriteCtx;
  const exitStart = Math.max(0, duration - exitDur);

  let opacity = 1;
  let scale = 1;

  if (localTime < entryDur) {
    const t = Easing.easeOutBack(clamp(localTime / entryDur, 0, 1));
    opacity = clamp(localTime / entryDur, 0, 1);
    scale = 0.4 + 0.6 * t;
  } else if (localTime > exitStart) {
    const t = Easing.easeInQuad(clamp((localTime - exitStart) / exitDur, 0, 1));
    opacity = 1 - t;
    scale = 1 - 0.15 * t;
  }

  const overrides = render ? render(spriteCtx) : {};

  return (
    <div style={{
      position: 'absolute',
      left: x, top: y,
      width, height,
      background: color,
      borderRadius: radius,
      opacity,
      transform: `scale(${scale})`,
      transformOrigin: 'center',
      willChange: 'transform, opacity',
      ...overrides,
    }} />
  );
}


function Stage({
  width = 1280,
  height = 720,
  duration = 10,
  background = '#f6f4ef',
  fps = 60,
  loop = true,
  autoplay = true,
  persistKey = 'animstage',
  children,
}) {
  const [time, setTime] = React.useState(() => {
    try {
      const v = parseFloat(localStorage.getItem(persistKey + ':t') || '0');
      return isFinite(v) ? clamp(v, 0, duration) : 0;
    } catch { return 0; }
  });
  const [playing, setPlaying] = React.useState(autoplay);
  const [hoverTime, setHoverTime] = React.useState(null);
  const [scale, setScale] = React.useState(1);

  const stageRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const rafRef = React.useRef(null);
  const lastTsRef = React.useRef(null);

  // Persist playhead
  React.useEffect(() => {
    try { localStorage.setItem(persistKey + ':t', String(time)); } catch {}
  }, [time, persistKey]);

  // Auto-scale to fit viewport
  React.useEffect(() => {
    if (!stageRef.current) return;
    const el = stageRef.current;
    const measure = () => {
      const barH = 44; // playback bar height
      const cw = el.clientWidth || (el.parentElement && el.parentElement.clientWidth) || 0;
      const ch = el.clientHeight || (el.parentElement && el.parentElement.clientHeight) || 0;
      // ignore transient zero/near-zero measurements during mount/layout settle
      if (cw < 2 || ch < 2) return;
      const s = Math.min(cw / width, (ch - barH) / height);
      if (s > 0) setScale(s);
    };
    measure();
    // re-measure across a few frames + after fonts load, since the x-import
    // mount can report 0px until layout settles
    const rafs = [requestAnimationFrame(measure), requestAnimationFrame(() => requestAnimationFrame(measure))];
    const t = setTimeout(measure, 120);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      rafs.forEach(cancelAnimationFrame);
      clearTimeout(t);
    };
  }, [width, height]);

  // Animation loop
  React.useEffect(() => {
    if (!playing) {
      lastTsRef.current = null;
      return;
    }
    const step = (ts) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000 * 0.78;
      lastTsRef.current = ts;
      setTime((t) => {
        let next = t + dt;
        if (next >= duration) {
          if (loop) next = next % duration;
          else { next = duration; setPlaying(false); }
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [playing, duration, loop]);

  // Keyboard: space = play/pause, ← → = seek
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setPlaying(p => !p);
      } else if (e.code === 'ArrowLeft') {
        setTime(t => clamp(t - (e.shiftKey ? 1 : 0.1), 0, duration));
      } else if (e.code === 'ArrowRight') {
        setTime(t => clamp(t + (e.shiftKey ? 1 : 0.1), 0, duration));
      } else if (e.key === '0' || e.code === 'Home') {
        setTime(0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [duration]);

  const displayTime = hoverTime != null ? hoverTime : time;

  const ctxValue = React.useMemo(
    () => ({ time: displayTime, duration, playing, setTime, setPlaying }),
    [displayTime, duration, playing]
  );

  // dev seek hook (used for frame inspection)
  if (typeof window !== 'undefined') { window.__seek = (v) => { setPlaying(false); setTime(v); }; window.__play = () => setPlaying(true); }

  return (
    <div
      ref={stageRef}
      style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        background: '#0a0a0a',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Canvas area — vertically centered in remaining space */}
      <div style={{
        flex: 1,
        width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        minHeight: 0,
      }}>
        <div
          ref={canvasRef}
          style={{
            width, height,
            background,
            position: 'relative',
            transform: `scale(${scale})`,
            transformOrigin: 'center',
            flexShrink: 0,
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          }}
        >
          <TimelineContext.Provider value={ctxValue}>
            {children}
          </TimelineContext.Provider>
        </div>
      </div>

      {/* Playback bar — stacked below canvas, never overlapping */}
      <PlaybackBar
        time={displayTime}
        actualTime={time}
        duration={duration}
        playing={playing}
        onPlayPause={() => setPlaying(p => !p)}
        onReset={() => { setTime(0); }}
        onSeek={(t) => setTime(t)}
        onHover={(t) => setHoverTime(t)}
      />
    </div>
  );
}

// ── Playback bar ────────────────────────────────────────────────────────────
// Play/pause, return-to-begin, scrub track, time display.
// Uses fixed-width time fields so layout doesn't thrash.

function PlaybackBar({ time, duration, playing, onPlayPause, onReset, onSeek, onHover }) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);

  const timeFromEvent = React.useCallback((e) => {
    const rect = trackRef.current.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    return x * duration;
  }, [duration]);

  const onTrackMove = (e) => {
    if (!trackRef.current) return;
    const t = timeFromEvent(e);
    if (dragging) {
      onSeek(t);
    } else {
      onHover(t);
    }
  };

  const onTrackLeave = () => {
    if (!dragging) onHover(null);
  };

  const onTrackDown = (e) => {
    setDragging(true);
    const t = timeFromEvent(e);
    onSeek(t);
    onHover(null);
  };

  React.useEffect(() => {
    if (!dragging) return;
    const onUp = () => setDragging(false);
    const onMove = (e) => {
      if (!trackRef.current) return;
      const t = timeFromEvent(e);
      onSeek(t);
    };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
    };
  }, [dragging, timeFromEvent, onSeek]);

  const pct = duration > 0 ? (time / duration) * 100 : 0;
  const fmt = (t) => {
    const total = Math.max(0, t);
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    const cs = Math.floor((total * 100) % 100);
    return `${String(m).padStart(1, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  };

  const mono = 'JetBrains Mono, ui-monospace, SFMono-Regular, monospace';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '8px 16px',
      background: 'rgba(20,20,20,0.92)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      width: '100%',
      maxWidth: 680,
      alignSelf: 'center',

      borderRadius: 8,
      color: '#f6f4ef',
      fontFamily: 'Inter, system-ui, sans-serif',
      userSelect: 'none',
      flexShrink: 0,
    }}>
      <IconButton onClick={onReset} title="Return to start (0)">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 2v10M12 2L5 7l7 5V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
        </svg>
      </IconButton>
      <IconButton onClick={onPlayPause} title="Play/pause (space)">
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="3" y="2" width="3" height="10" fill="currentColor"/>
            <rect x="8" y="2" width="3" height="10" fill="currentColor"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 2l9 5-9 5V2z" fill="currentColor"/>
          </svg>
        )}
      </IconButton>

      {/* Current time: fixed width so it doesn't thrash */}
      <div style={{
        fontFamily: mono,
        fontSize: 12,
        fontVariantNumeric: 'tabular-nums',
        width: 64, textAlign: 'right',
        color: '#f6f4ef',
      }}>
        {fmt(time)}
      </div>

      {/* Scrub track */}
      <div
        ref={trackRef}
        onMouseMove={onTrackMove}
        onMouseLeave={onTrackLeave}
        onMouseDown={onTrackDown}
        style={{
          flex: 1,
          height: 22,
          position: 'relative',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center',
        }}
      >
        <div style={{
          position: 'absolute',
          left: 0, right: 0, height: 4,
          background: 'rgba(255,255,255,0.12)',
          borderRadius: 2,
        }}/>
        <div style={{
          position: 'absolute',
          left: 0, width: `${pct}%`, height: 4,
          background: 'oklch(72% 0.12 250)',
          borderRadius: 2,
        }}/>
        <div style={{
          position: 'absolute',
          left: `${pct}%`, top: '50%',
          width: 12, height: 12,
          marginLeft: -6, marginTop: -6,
          background: '#fff',
          borderRadius: 6,
          boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
        }}/>
      </div>

      {/* Duration: fixed width */}
      <div style={{
        fontFamily: mono,
        fontSize: 12,
        fontVariantNumeric: 'tabular-nums',
        width: 64, textAlign: 'left',
        color: 'rgba(246,244,239,0.55)',
      }}>
        {fmt(duration)}
      </div>
    </div>
  );
}

function IconButton({ children, onClick, title }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 28, height: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hover ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 6,
        color: '#f6f4ef',
        cursor: 'pointer',
        padding: 0,
        transition: 'background 120ms',
      }}
    >
      {children}
    </button>
  );
}


Object.assign(window, {
  Easing, interpolate, animate, clamp,
  TimelineContext, useTime, useTimeline,
  Sprite, SpriteContext, useSprite,
  TextSprite, ImageSprite, RectSprite,
  Stage, PlaybackBar,
});

// ═════════════════════════════════════════════════════════════════════════════
//  intelligentartificialness.com — 5 motion directions. concept: AI, inverted.
//  5 movements × 5.5s = 27.5s loop.
// ═════════════════════════════════════════════════════════════════════════════

const SERIF = "'Fraunces', Georgia, serif";
const HEAVY = "'Archivo', system-ui, sans-serif";
const MONO  = "'JetBrains Mono', ui-monospace, monospace";

const INK   = '#0A0A0A';
const ACID  = '#E4FF3A';
const KLEIN = '#1E1BE0';
const RED   = '#FF2E2E';
const MAG   = '#FF2E9E';
const CYAN  = '#2EE6FF';
const BONE  = '#F4F1EA';
const TEAL  = '#5EEAD4';

const DOMAIN = 'intelligentartificialness.com';

const seg  = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const eOut = Easing.easeOutCubic;
const eBack = Easing.easeOutBack;
const rnd = (n) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
const jit = (t, amp, s = 0) => { const f = Math.floor(t * 13) + s; return { x: (rnd(f) - 0.5) * amp * 0.55, y: (rnd(f + 7) - 0.5) * amp * 0.55 }; };

const GRAIN = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")";

function SceneFrame({ start, end, bg, children }) {
  const t = useTime();
  if (t < start - 0.02 || t > end + 0.02) return null;
  return <div style={{ position: 'absolute', inset: 0, background: bg, overflow: 'hidden' }}>{children}</div>;
}

function MarqueeRow({ text, fs, family = HEAVY, weight = 900, color, speed, dir = 'left', tileW, shadow = 'none', ls = '-0.03em' }) {
  const t = useTime();
  const off = ((t * speed) % tileW + tileW) % tileW;
  const x = dir === 'left' ? -off : off - tileW;
  const K = Math.ceil(1920 / tileW) + 3;
  const tiles = [];
  for (let i = 0; i < K; i++) {
    tiles.push(<span key={i} style={{ display: 'inline-block', width: tileW, whiteSpace: 'nowrap',
      fontFamily: family, fontWeight: weight, fontSize: fs, color, letterSpacing: ls, textShadow: shadow }}>{text}</span>);
  }
  return <div style={{ position: 'absolute', left: 0, top: '50%', display: 'flex',
    transform: `translateY(-50%) translateX(${x}px)`, willChange: 'transform' }}>{tiles}</div>;
}

// ── 01 · OVERLOAD ────────────────────────────────────────────────────────────
function S1() {
  const S = 0, E = 11.72; const t = useTime(); const L = t - S;
  const ROWS = 7, RH = 158, FS = 120;
  const colors = [ACID, KLEIN, ACID, RED, ACID, KLEIN, ACID];
  const gAmt = 1.5 + 32 * Math.pow(seg(L, 2.2, 3.4), 1.6);
  const strobe = clamp(seg(L, 3.36, 3.44) - seg(L, 3.5, 3.74), 0, 1);
  const reveal = L >= 3.4;
  const aiS = 0.985 + 0.015 * eOut(seg(L, 3.4, 4.1));
  const sAmp = 2 + 13 * seg(L, 2.2, 3.4) + (reveal ? 6 : 0);
  const sh = jit(t, sAmp);
  const zoom = 1;
  const aiBreathe = reveal ? 1 + 0.01 * Math.sin((L - 3.4) * 1.6) : 1;
  const rows = [];
  for (let i = 0; i < ROWS; i++) {
    const inn = clamp(seg(L, i * 0.08, i * 0.08 + 0.5), 0, 1);
    const dir = i % 2 ? 'right' : 'left';
    const a = gAmt * (0.35 + 0.65 * rnd(i + 3));
    rows.push(
      <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: i * RH - 10, height: RH, overflow: 'hidden', opacity: inn }}>
        <MarqueeRow text="intelligentartificialness ✲ " fs={FS} color={colors[i]} speed={48 + (i % 3) * 38} dir={dir} tileW={1700} shadow={`${-a}px 0 ${RED}, ${a}px 0 ${CYAN}`} />
      </div>
    );
  }
  return (
    <SceneFrame start={S} end={E} bg={INK}>
      <div style={{ position: 'absolute', inset: 0, transform: `translate(${sh.x}px,${sh.y}px) scale(${zoom})`, transformOrigin: '50% 50%' }}>
        {rows}
        {reveal && <div style={{ position: 'absolute', inset: 0, background: INK, opacity: 0.84 }} />}
        {reveal && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: HEAVY, fontWeight: 900, fontSize: 560, lineHeight: 1, letterSpacing: '-0.05em',
            transform: `scale(${aiS * aiBreathe})`, textShadow: `${-gAmt * 0.5}px 0 ${MAG}, ${gAmt * 0.5}px 0 ${CYAN}` }}>
            <span style={{ color: BONE }}>A</span><span style={{ color: ACID }}>I</span>
          </div>
        )}
      </div>
      <div style={{ position: 'absolute', inset: 0, background: ACID, opacity: strobe * 0.55, pointerEvents: 'none' }} />
    </SceneFrame>
  );
}

// ── 02 · TICKER ──────────────────────────────────────────────────────────────
function S2() {
  const S = 11.7, E = 23.42; const t = useTime(); const L = t - S;
  const R = [
    { t: 'intelligentartificialness ✲ ', fs: 120, fam: HEAVY, w: 900, col: ACID,  sp: 100, tw: 1720, dir: 'left',  ls: '-0.03em' },
    { t: 'ARTIFICIAL INTELLIGENCE · REARRANGED · ', fs: 44, fam: MONO, w: 500, col: BONE, sp: 80, tw: 1340, dir: 'right', ls: '0.14em' },
    { t: 'intelligentartificialness ✲ ', fs: 120, fam: HEAVY, w: 900, col: KLEIN, sp: 135, tw: 1720, dir: 'right', ls: '-0.03em' },
    { t: 'INTELLIGENTARTIFICIALNESS.COM · ', fs: 44, fam: MONO, w: 500, col: ACID, sp: 100, tw: 1140, dir: 'left', ls: '0.14em' },
    { t: 'intelligentartificialness ✲ ', fs: 120, fam: HEAVY, w: 900, col: RED,   sp: 75,  tw: 1720, dir: 'left',  ls: '-0.03em' },
    { t: 'ARTIFICIAL · INTELLIGENCE · REARRANGED · ', fs: 44, fam: MONO, w: 500, col: KLEIN, sp: 95, tw: 1340, dir: 'right', ls: '0.14em' },
  ];
  const inn = seg(L, 0, 0.6);
  const inv = Math.floor(L * 1.1) % R.length;
  const aa = 2 + 3 * Math.abs(Math.sin(t * 8));
  const sh = jit(t, 2.4);
  const RH = 180;
  return (
    <SceneFrame start={S} end={E} bg={INK}>
      <div style={{ position: 'absolute', inset: 0, transform: `translate(${sh.x}px,${sh.y}px)`, opacity: inn }}>
        {R.map((r, i) => {
          const isInv = i === inv;
          return (
            <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: i * RH - 8, height: RH, overflow: 'hidden', background: isInv ? r.col : 'transparent' }}>
              <MarqueeRow text={r.t} fs={r.fs} family={r.fam} weight={r.w} color={isInv ? INK : r.col} speed={r.sp} dir={r.dir} tileW={r.tw} ls={r.ls}
                shadow={isInv ? 'none' : `${-aa}px 0 ${RED}, ${aa}px 0 ${CYAN}`} />
            </div>
          );
        })}
      </div>
    </SceneFrame>
  );
}

// ── 03 · MONOGRAM (ai ⇄ ia) ──────────────────────────────────────────────────
function S3() {
  const S = 23.4, E = 35.12; const t = useTime(); const L = t - S;
  const p = eBack(seg(L, 0.25, 1.1));
  const breathe = 1 + 0.012 * Math.sin(L * 1.5);
  const stut = clamp(seg(L, 2.0, 2.3) - seg(L, 2.7, 3.0), 0, 1) + clamp(seg(L, 3.5, 3.8) - seg(L, 4.2, 4.5), 0, 1);
  const flashM = clamp(Math.max(seg(L, 1.0, 1.08) - seg(L, 1.14, 1.34), seg(L, 2.1, 2.16) - seg(L, 2.22, 2.4)), 0, 1);
  const a = 3 + 4 * Math.abs(Math.sin(t * 9));
  const cap = seg(L, 1.3, 2.1);
  return (
    <SceneFrame start={S} end={E} bg={KLEIN}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 150, textAlign: 'center', fontFamily: SERIF,
        fontWeight: 800, fontSize: 420, lineHeight: 1, transform: `scale(${breathe})`, textShadow: `${-a}px 0 ${MAG}, ${a}px 0 ${CYAN}` }}>
        <span style={{ display: 'inline-block', color: BONE, opacity: clamp(p,0,1), transform: `translateX(${(1-p)*-120 + stut*215}px)` }}>a</span>
        <span style={{ display: 'inline-block', color: ACID, opacity: clamp(p,0,1), transform: `translateX(${(1-p)*120 - stut*215}px)` }}>i</span>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 726, textAlign: 'center', fontFamily: MONO, fontSize: 24, letterSpacing: '0.28em', color: BONE, opacity: cap }}>INTELLIGENTARTIFICIALNESS.COM</div>
      <div style={{ position: 'absolute', inset: 0, background: ACID, opacity: flashM * 0.4, pointerEvents: 'none' }} />
    </SceneFrame>
  );
}

// ── 04 · TERMINAL ────────────────────────────────────────────────────────────
function S4() {
  const S = 35.1, E = 46.82; const t = useTime(); const L = t - S;
  const BG = '#0B0C0F', FG = '#E8E6DF', DIM = '#5A6066';
  const typed = DOMAIN.slice(0, Math.floor(seg(L, 0.5, 3.6) * DOMAIN.length));
  const inG = L > 3.7 && L < 4.2;
  const blink = Math.floor(t * 2.2) % 2 === 0;
  const status = seg(L, 4.3, 5.0);
  const gdx = inG ? (rnd(Math.floor(t * 22)) - 0.5) * 6 : 0;
  const shadow = inG ? `2px 0 ${RED}, -2px 0 ${CYAN}` : 'none';
  return (
    <SceneFrame start={S} end={E} bg={BG}>
      <div style={{ position: 'absolute', left: 240, top: 420, fontFamily: MONO }}>
        <div style={{ fontSize: 22, color: DIM, letterSpacing: '0.04em', opacity: seg(L, 0.15, 0.7) }}>{'// resolving identity —'}</div>
        <div style={{ fontSize: 66, color: FG, marginTop: 24, transform: `translateX(${gdx}px)`, textShadow: shadow, whiteSpace: 'pre' }}>
          <span style={{ color: TEAL }}>~ </span>{typed}
          <span style={{ display: 'inline-block', width: 30, height: 62, marginBottom: -8, marginLeft: 6, background: TEAL, opacity: blink ? 1 : 0 }} />
        </div>
        <div style={{ fontSize: 24, color: TEAL, marginTop: 34, opacity: status }}>✓ artificial · intelligence · interoperable</div>
      </div>
    </SceneFrame>
  );
}

// ── 05 · SLAM ────────────────────────────────────────────────────────────────
function S5() {
  const S = 46.8, E = 58.5; const t = useTime(); const L = t - S;
  const combos = [[INK, ACID], [ACID, INK], [KLEIN, ACID], [RED, BONE], [ACID, KLEIN]];
  const slam = L >= 1.3;
  const sh = jit(t, slam ? 2.2 : 5);
  if (!slam) {
    const k = ((Math.floor(L / 0.34) % combos.length) + combos.length) % combos.length;
    const bg = combos[k][0], fg = combos[k][1];
    const a = 3 + 5 * rnd(Math.floor(t * 16));
    return (
      <SceneFrame start={S} end={E} bg={bg}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: `translate(${sh.x}px,${sh.y}px)`, padding: '0 70px', textAlign: 'center',
          fontFamily: HEAVY, fontWeight: 900, fontSize: 96, color: fg, letterSpacing: '-0.04em',
          textShadow: `${-a}px 0 ${MAG}, ${a}px 0 ${CYAN}` }}>
          intelligentartificialness<span style={{ color: fg === ACID ? KLEIN : ACID }}>.com</span>
        </div>
      </SceneFrame>
    );
  }
  // poster — with an inversion-beat kicker + live mini-ticker so it never sits still
  const inv = L > 3.0 && L < 3.35;             // brief color flip
  const bg = inv ? INK : ACID;
  const fg = inv ? ACID : INK;
  const com = inv ? ACID : KLEIN;
  const settle = eOut(seg(L, 1.3, 1.95));
  const burst = clamp(seg(L, 1.3, 1.4) - seg(L, 1.5, 1.8), 0, 1);
  const a = 2 + 24 * burst;
  const punch = 1.28 + (1 - 1.28) * eBack(seg(L, 1.3, 2.0));
  const barW = eOut(seg(L, 1.5, 2.2));
  const lab = seg(L, 2.0, 2.6);
  const push = 1 + 0.015 * Math.sin((L - 1.3) * 1.1);
  return (
    <SceneFrame start={S} end={E} bg={bg}>
      <div style={{ position: 'absolute', inset: 0, transform: `translate(${sh.x}px,${sh.y}px) scale(${push})`, transformOrigin: '50% 50%' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 452, textAlign: 'center', padding: '0 70px',
          fontFamily: HEAVY, fontWeight: 900, fontSize: 100, letterSpacing: '-0.04em',
          WebkitTextStroke: '2px ' + fg, color: 'transparent', opacity: 0.16, transform: 'translate(8px,8px)' }}>
          intelligentartificialness.com
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 452, textAlign: 'center', padding: '0 70px',
          fontFamily: HEAVY, fontWeight: 900, fontSize: 100, color: fg, letterSpacing: '-0.04em',
          transform: `scale(${punch})`, transformOrigin: '50% 50%', textShadow: `${-a}px 0 ${MAG}, ${a}px 0 ${KLEIN}` }}>
          intelligentartificialness<span style={{ color: com }}>.com</span>
        </div>
        <div style={{ position: 'absolute', left: '50%', top: 622, width: `${1560 * barW}px`, marginLeft: `${-780 * barW}px`, height: 22, background: fg }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 656, height: 44, overflow: 'hidden', opacity: lab }}>
          <MarqueeRow text="ARTIFICIAL INTELLIGENCE, REARRANGED · " fs={22} family={MONO} weight={500} color={fg} speed={70} dir="left" tileW={900} ls="0.2em" />
        </div>
      </div>
    </SceneFrame>
  );
}

function Grit() {
  const t = useTime();
  const gx = (rnd(Math.floor(t * 16)) * 60) | 0;
  const gy = (rnd(Math.floor(t * 16) + 3) * 60) | 0;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: GRAIN, backgroundSize: '140px 140px', backgroundPosition: `${gx}px ${gy}px`, opacity: 0.08, mixBlendMode: 'overlay' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.18) 3px, rgba(0,0,0,0) 4px)', opacity: 0.45, mixBlendMode: 'multiply' }} />
    </div>
  );
}

function IndexLabel() {
  const t = useTime();
  const sc = [
    { a: 0, n: '01', name: 'OVERLOAD', d: 1 }, { a: 11.7, n: '02', name: 'TICKER', d: 1 },
    { a: 23.4, n: '03', name: 'MONOGRAM', d: 1 }, { a: 35.1, n: '04', name: 'TERMINAL', d: 1 },
    { a: 46.8, n: '05', name: 'SLAM', d: 0 },
  ];
  let cur = sc[0]; for (const s of sc) if (t >= s.a) cur = s;
  const col = cur.d ? 'rgba(255,255,255,0.5)' : 'rgba(10,10,10,0.45)';
  return (
    <div style={{ position: 'absolute', left: 44, bottom: 36, fontFamily: MONO, fontSize: 13, letterSpacing: '0.22em', color: col, pointerEvents: 'none' }}>
      {cur.n} / 05 — {cur.name}
    </div>
  );
}

function Reel() {
  return (
    <Stage width={1920} height={1080} duration={58.5} background={INK} persistKey="iareel">
      <S1 /><S2 /><S3 /><S4 /><S5 /><Grit /><IndexLabel />
    </Stage>
  );
}

window.Reel = Reel;
