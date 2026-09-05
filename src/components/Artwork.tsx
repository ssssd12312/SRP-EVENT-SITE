import { useId } from 'react';
import { Bird, Brain, Dices, Hand, Hash, HelpCircle, Lightbulb, Scissors, Zap } from 'lucide-react';

export function Maple({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="m24 3 5.1 12.2 8.6-3.5-2.1 10.1 8.4 3.8-15.7 9.1L25 45h-2l-1.6-10.3L5 25.6l8.4-3.8-2.1-10.1 8.6 3.5Z" />
    </svg>
  );
}
export function Coin({ size = 18, className = '' }: { size?: number; className?: string }) {
  const id = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={`coin-icon ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#ffdf8a" />
          <stop offset="1" stopColor="#c07b16" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14" fill={`url(#${id})`} />
      <circle cx="16" cy="16" r="10.5" fill="none" stroke="#a8701f" strokeWidth="1.5" />
      <path
        d="m16 8 2.1 4.9 3.4-1.4-.8 4 3.3 1.6-6.3 3.6L16.5 25h-1l-.6-4.3-6.5-3.6 3.3-1.6-.8-4 3.4 1.4Z"
        fill="#835110"
      />
    </svg>
  );
}
export function Discord({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.7 5.1a18 18 0 0 0-4.4-1.4l-.6 1.2a16.8 16.8 0 0 0-5.3 0l-.6-1.2A18 18 0 0 0 4.4 5.1C1.6 9.3.8 13.4 1.2 17.5A18 18 0 0 0 6.6 20l1.1-1.8-1.7-.8.4-.3c3.6 1.7 7.6 1.7 11.2 0l.4.3-1.7.8 1.1 1.8a18 18 0 0 0 5.4-2.5c.5-4.7-.8-8.8-3.1-12.4ZM8.5 14.8c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm7 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z" />
    </svg>
  );
}
const palettes: Record<string, string[]> = {
  orange: ['#f2a941', '#a74e22'],
  purple: ['#b58aee', '#60479a'],
  green: ['#a6c675', '#496f45'],
  pink: ['#e7a39e', '#984c59'],
  yellow: ['#edcf73', '#9d721e'],
  blue: ['#84b6d1', '#416481'],
};
export function GameArt({
  engine,
  accent = 'orange',
  large = false,
}: {
  engine: string;
  accent?: string;
  large?: boolean;
}) {
  const id = useId().replace(/:/g, ''),
    [light, dark] = palettes[accent] || palettes.orange;
  const block = (x: number, y: number, c: string, key: string | number) => (
    <g key={key}>
      <rect x={x + 2} y={y + 5} width="25" height="25" rx="5" fill="#000" opacity=".25" />
      <rect x={x} y={y} width="25" height="25" rx="5" fill={c} />
      <path
        d={`M${x + 4} ${y + 21}V${y + 5}Q${x + 4} ${y + 3} ${x + 7} ${y + 3}H${x + 20}`}
        fill="none"
        stroke="white"
        opacity=".23"
        strokeWidth="2"
      />
      <path
        d={`M${x + 24} ${y + 5}v16q0 4-4 4H${x + 5}`}
        fill="none"
        stroke="black"
        opacity=".2"
        strokeWidth="2"
      />
    </g>
  );
  const iconMap: Record<string, typeof Zap> = {
    reaction: Zap,
    flappy: Bird,
    rps: Scissors,
    quiz: Lightbulb,
    sequence: Brain,
    guess: Hash,
  };
  const Icon = iconMap[engine] || HelpCircle;
  return (
    <div className={`game-art art-${accent} ${large ? 'art-large' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 260 155" fill="none">
        <defs>
          <radialGradient id={`glow${id}`}>
            <stop stopColor={light} stopOpacity=".2" />
            <stop offset="1" stopColor={light} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`metal${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#505046" />
            <stop offset="1" stopColor="#161915" />
          </linearGradient>
          <linearGradient id={`light${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor={light} />
            <stop offset="1" stopColor={dark} />
          </linearGradient>
        </defs>
        <ellipse cx="130" cy="87" rx="111" ry="69" fill={`url(#glow${id})`} />
        <ellipse cx="130" cy="135" rx="57" ry="9" fill="#050704" opacity=".32" />
        <path d="m30 49 4-4m185 69 4-4m-27-84 3 3m-147 78 4 4" stroke={light} opacity=".4" strokeWidth="2" />
        <circle cx="212" cy="57" r="2" fill={light} opacity=".5" />
        <circle cx="52" cy="85" r="1.5" fill={light} opacity=".4" />
        {engine === 'mines' ? (
          <g transform="translate(74 28) rotate(-13 56 55)">
            {[0, 1, 2].map((y) =>
              [0, 1, 2].map((x) => (
                <g key={`${x}${y}`}>
                  <rect x={x * 37} y={y * 34 + 5} width="33" height="30" rx="6" fill="#11140f" />
                  <rect
                    x={x * 37}
                    y={y * 34}
                    width="33"
                    height="30"
                    rx="6"
                    fill={x === 1 && y === 1 ? dark : `url(#metal${id})`}
                    stroke="#5b5b46"
                    strokeOpacity=".4"
                  />
                  {(x + y) % 3 === 0 && (
                    <text
                      x={x * 37 + 16}
                      y={y * 34 + 22}
                      fill={light}
                      textAnchor="middle"
                      fontSize="19"
                      fontWeight="800"
                    >
                      {x === 0 ? '1' : '2'}
                    </text>
                  )}
                </g>
              )),
            )}
            <g transform="translate(54 46)">
              <path d="m8-13 5-9q6-8 9-1" stroke={light} strokeWidth="3" strokeLinecap="round" />
              <circle r="18" fill="#0d110c" stroke="#74725b" />
              <ellipse cx="-5" cy="-6" rx="5" ry="3" transform="rotate(-30)" fill="#8b8b70" opacity=".6" />
              <path
                d="m22-32 1-7m5 12 7-2m-12-2 5-5"
                stroke="#ffc15d"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </g>
          </g>
        ) : engine === 'tetris' ? (
          <g transform="translate(73 18) rotate(-9 55 60)">
            {[
              [1, 0],
              [0, 1],
              [1, 1],
              [2, 1],
            ].map(([x, y], i) => block(x * 29, y * 29, light, 'a' + i))}
            {[
              [2, 2],
              [2, 3],
              [1, 3],
            ].map(([x, y], i) => block(x * 29, y * 29, dark, 'b' + i))}
            {[
              [0, 2],
              [0, 3],
            ].map(([x, y], i) => block(x * 29, y * 29, '#6e6593', 'c' + i))}
            <path d="m111 32 4-8 4 8 8 4-8 4-4 8-4-8-8-4Z" fill={light} opacity=".5" />
          </g>
        ) : engine === 'snake' ? (
          <g transform="translate(55 22) rotate(-9 72 56)">
            <path
              d="M8 116h138M8 84h138M8 52h138M8 20h138M25 5v125m32-125v125m32-125v125m32-125v125"
              stroke={light}
              opacity=".08"
            />
            <path
              d="M34 100H20V47h62v53h47V29"
              stroke="#172818"
              strokeWidth="24"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <path
              d="M34 96H20V43h62v53h47V25"
              stroke={`url(#light${id})`}
              strokeWidth="23"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <path
              d="M34 91H25V45h54"
              stroke="white"
              strokeOpacity=".2"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <rect x="114" y="9" width="29" height="31" rx="11" fill={light} />
            <circle cx="122" cy="18" r="3.5" fill="#1e331b" />
            <circle cx="135" cy="18" r="3.5" fill="#1e331b" />
            <path d="M57 22q-7-7-3-12" stroke="#93ac69" strokeWidth="3" />
            <path d="M52 23c-17-15-22 15-6 21 5 2 4-1 8-1s4 3 8 0c13-8 7-32-10-20Z" fill="#d47b57" />
          </g>
        ) : engine === 'memory' ? (
          <g transform="translate(74 25)">
            <g transform="rotate(-23 31 59)">
              <rect
                width="67"
                height="94"
                rx="9"
                x="-9"
                y="10"
                fill="#985e64"
                stroke="#e7b09d"
                strokeOpacity=".5"
              />
              <rect width="53" height="80" rx="5" x="-2" y="17" stroke="#d39994" strokeOpacity=".5" />
              <path d="m24 40 7 13 14 3-11 10 1 16-13-8-13 4 4-14-8-11 14-1Z" fill="#e4b2a6" />
            </g>
            <g transform="rotate(16 65 56)">
              <rect
                width="67"
                height="94"
                rx="9"
                x="46"
                y="8"
                fill="#a4b5a0"
                stroke="#d3d8b5"
                strokeOpacity=".7"
              />
              <rect width="53" height="80" rx="5" x="53" y="15" stroke="#e0e6c5" strokeOpacity=".5" />
              <path d="m80 34 6 13 13-5-2 15 10 5-23 12-4 13-3-13-23-12 10-5-2-15 13 5Z" fill="#e6e5c0" />
            </g>
          </g>
        ) : engine === '2048' ? (
          <g transform="translate(76 24) rotate(-10 55 55)">
            {[
              [0, 0, '8'],
              [1, 0, '16'],
              [0, 1, '32'],
              [1, 1, '64'],
            ].map(([x, y, n], i) => (
              <g key={i}>
                <rect
                  x={Number(x) * 58}
                  y={Number(y) * 58 + 4}
                  width="51"
                  height="51"
                  rx="10"
                  fill="#68451e"
                />
                <rect
                  x={Number(x) * 58}
                  y={Number(y) * 58}
                  width="51"
                  height="51"
                  rx="10"
                  fill={i === 3 ? light : dark}
                />
                <text
                  x={Number(x) * 58 + 25}
                  y={Number(y) * 58 + 34}
                  textAnchor="middle"
                  fill={i === 3 ? '#51300f' : '#ffdc98'}
                  fontSize="25"
                  fontWeight="800"
                >
                  {n}
                </text>
              </g>
            ))}
          </g>
        ) : engine === 'whack' ? (
          <g transform="translate(130 83) rotate(-8)">
            <path d="M0-34q-8-19 9-24" stroke="#759056" strokeWidth="9" strokeLinecap="round" />
            <ellipse rx="58" ry="45" fill={dark} />
            <ellipse rx="41" ry="45" fill="#d9892e" />
            <ellipse rx="21" ry="45" fill={light} />
            <path d="m-25-5 13-13 6 17m31-4-13-13-6 17M-24 15l12 9 12-6 12 6 12-9" fill="#50300f" />
            <path d="M-8-35q-8 17-7 24" stroke="#ffe099" opacity=".5" strokeWidth="4" strokeLinecap="round" />
          </g>
        ) : (
          <g>
            <rect
              x="83"
              y="31"
              width="98"
              height="100"
              rx="27"
              transform="rotate(-12 130 81)"
              fill={dark}
              opacity=".5"
            />
            <rect
              x="81"
              y="25"
              width="98"
              height="100"
              rx="27"
              transform="rotate(-12 130 75)"
              fill={`url(#light${id})`}
              stroke={light}
            />
            <foreignObject x="94" y="38" width="72" height="72">
              <div
                style={{
                  color: accent === 'yellow' ? '#74551d' : '#26251e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  transform: 'rotate(-12deg)',
                }}
              >
                <Icon size={56} strokeWidth={1.7} />
              </div>
            </foreignObject>
            {engine === 'rps' && (
              <foreignObject x="174" y="78" width="40" height="40">
                <Hand size={32} color={light} />
              </foreignObject>
            )}
            {engine === 'guess' && (
              <foreignObject x="54" y="63" width="40" height="40">
                <Dices size={30} color={light} />
              </foreignObject>
            )}
          </g>
        )}
      </svg>
    </div>
  );
}
export function TrophyArt({ place = 1 }: { place?: number }) {
  const id = useId();
  const c =
    place === 1
      ? ['#ffe4a0', '#e7a833', '#996023']
      : place === 2
        ? ['#e0e5e7', '#929fa4', '#4c5d63']
        : ['#f1c5a1', '#b98054', '#6e4933'];
  return (
    <svg viewBox="0 0 240 190" className={`trophy-art trophy-${place}`} aria-hidden="true">
      <defs>
        <linearGradient id={id}>
          <stop stopColor={c[2]} />
          <stop offset=".35" stopColor={c[0]} />
          <stop offset=".65" stopColor={c[1]} />
          <stop offset="1" stopColor={c[2]} />
        </linearGradient>
      </defs>
      <ellipse cx="120" cy="174" rx="67" ry="11" fill="#000" opacity=".2" />
      <path d="M77 43H50v27q0 28 36 30m77-57h27v27q0 28-36 30" fill="none" stroke={c[1]} strokeWidth="10" />
      <path d="M72 32h96l-9 56q-5 30-32 33v26h27v17H87v-17h26v-26q-27-3-32-33Z" fill={`url(#${id})`} />
      <rect x="67" y="26" width="106" height="13" rx="6" fill={c[0]} />
      <rect x="78" y="163" width="85" height="11" rx="4" fill={c[2]} />
      <path d="m120 52 7 15 17 2-12 12 3 17-15-8-15 8 3-17-12-12 17-2Z" fill={c[2]} opacity=".65" />
      <path d="M89 47l6 33" stroke="white" opacity=".35" strokeWidth="4" strokeLinecap="round" />
      <path
        d="m189 113 3-9 3 9 9 3-9 3-3 9-3-9-9-3Zm-139 0 2-6 2 6 6 2-6 2-2 6-2-6-6-2Z"
        fill={c[1]}
        opacity=".7"
      />
    </svg>
  );
}
