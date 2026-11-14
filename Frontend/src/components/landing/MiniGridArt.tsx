// Line illustration of a street mini-grid: rooftop panels, a battery and the
// homes and spaza shop it feeds. Our own drawing, not a photo of the site.

export default function MiniGridArt({
  dark = false,
  className = "",
  label,
}: {
  dark?: boolean;
  className?: string;
  label: string;
}) {
  const ink = dark ? "#e4e4e7" : "#18181b";
  const wall = dark ? "#27272a" : "#fafafa";
  const roof = dark ? "#3f3f46" : "#e4e4e7";
  const panel = dark ? "#e4e4e7" : "#18181b";
  const panelLine = dark ? "#27272a" : "#f4f4f5";
  const wire = dark ? "#a1a1aa" : "#52525b";

  const Panel = ({ x, y, w = 56 }: { x: number; y: number; w?: number }) => (
    <g>
      <polygon points={`${x},${y + 14} ${x + 10},${y} ${x + w + 10},${y} ${x + w},${y + 14}`} fill={panel} />
      {[1, 2, 3].map((i) => (
        <line
          key={i}
          x1={x + (w / 4) * i}
          y1={y + 14}
          x2={x + (w / 4) * i + 10}
          y2={y}
          stroke={panelLine}
          strokeWidth="1"
        />
      ))}
      <line x1={x + 5} y1={y + 7} x2={x + w + 5} y2={y + 7} stroke={panelLine} strokeWidth="1" />
    </g>
  );

  const House = ({ x, w = 76 }: { x: number; w?: number }) => (
    <g>
      <rect x={x} y={196} width={w} height={64} fill={wall} stroke={ink} strokeWidth="1.5" />
      <polygon points={`${x - 6},${198} ${x + w / 2},${158} ${x + w + 6},${198}`} fill={roof} stroke={ink} strokeWidth="1.5" />
      <rect x={x + w / 2 - 9} y={228} width={18} height={32} fill="none" stroke={ink} strokeWidth="1.5" />
      <rect x={x + 8} y={210} width={14} height={12} fill="none" stroke={ink} strokeWidth="1.2" />
    </g>
  );

  return (
    <svg viewBox="0 0 420 300" role="img" aria-label={label} className={className}>
      {/* sun */}
      <g stroke={ink} strokeWidth="1.5" fill="none">
        <circle cx="352" cy="58" r="20" />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * Math.PI) / 6;
          // Rounded so the server and the browser print identical numbers.
          const r = (v: number) => Math.round(v * 100) / 100;
          return (
            <line
              key={i}
              x1={r(352 + Math.cos(a) * 28)}
              y1={r(58 + Math.sin(a) * 28)}
              x2={r(352 + Math.cos(a) * 36)}
              y2={r(58 + Math.sin(a) * 36)}
            />
          );
        })}
      </g>

      {/* ground */}
      <line x1="10" y1="260" x2="410" y2="260" stroke={ink} strokeWidth="1.5" />
      {Array.from({ length: 40 }).map((_, i) => (
        <line key={i} x1={14 + i * 10} y1="266" x2={14 + i * 10} y2="270" stroke={wire} strokeWidth="1" />
      ))}

      {/* homes */}
      <House x={22} />
      <House x={120} w={70} />
      <Panel x={28} y={166} w={44} />
      <Panel x={124} y={166} w={40} />

      {/* spaza shop: flat roof, striped awning, big panel array */}
      <rect x={222} y={186} width={92} height={74} fill={wall} stroke={ink} strokeWidth="1.5" />
      <rect x={216} y={178} width={104} height={8} fill={roof} stroke={ink} strokeWidth="1.5" />
      {Array.from({ length: 7 }).map((_, i) => (
        <rect key={i} x={226 + i * 12} y={196} width={6} height={10} fill={ink} />
      ))}
      <rect x={236} y={218} width={30} height={42} fill="none" stroke={ink} strokeWidth="1.5" />
      <rect x={274} y={218} width={30} height={24} fill="none" stroke={ink} strokeWidth="1.2" />
      <Panel x={220} y={156} w={44} />
      <Panel x={268} y={156} w={44} />

      {/* battery */}
      <g>
        <rect x={340} y={214} width={52} height={46} fill={wall} stroke={ink} strokeWidth="1.5" />
        <rect x={356} y={208} width={20} height={6} fill={ink} />
        <polygon points="368,222 358,240 366,240 362,254 376,234 367,234 372,222" fill={ink} />
      </g>

      {/* wires: panels to battery, battery to every building */}
      <g stroke={wire} strokeWidth="1.2" fill="none" strokeDasharray="4 4">
        <path d="M366 208 V128 H60 V158" />
        <path d="M155 128 V158" />
        <path d="M266 128 V150" />
      </g>
      <g fill={ink}>
        {[60, 155, 266, 366].map((x) => (
          <circle key={x} cx={x} cy={128} r="3" />
        ))}
      </g>
    </svg>
  );
}
