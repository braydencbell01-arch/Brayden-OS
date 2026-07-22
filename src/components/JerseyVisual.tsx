type JerseyProps = {
  className?: string
  primary: string
  secondary: string
  number: string
  accent?: string
}

function Jersey({ className, primary, secondary, number, accent = '#F4F7F5' }: JerseyProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M60 28c8-14 28-18 40-18s32 4 40 18l22 10 18 34-28 14v118c0 8-6 14-14 14H62c-8 0-14-6-14-14V86L20 72l18-34 22-10z"
        fill={primary}
      />
      <path
        d="M60 28c8-14 28-18 40-18s32 4 40 18l8 4v18c-10-8-26-12-48-12S62 40 52 50V32l8-4z"
        fill={secondary}
      />
      <path d="M38 86l-18-14 8-16 22 8v22H38zm124 0h-12V64l22-8 8 16-18 14z" fill={secondary} />
      <path
        d="M74 118h52c4 0 6 3 5 7l-8 42c-1 4-4 7-8 7H85c-4 0-7-3-8-7l-8-42c-1-4 1-7 5-7z"
        fill={secondary}
        opacity="0.35"
      />
      <text
        x="100"
        y="168"
        textAnchor="middle"
        fill={accent}
        fontFamily="Bebas Neue, sans-serif"
        fontSize="72"
        letterSpacing="2"
      >
        {number}
      </text>
      <circle cx="100" cy="96" r="10" fill={accent} opacity="0.9" />
    </svg>
  )
}

export function HeroVisual() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 70% 40%, rgba(31,138,91,0.45), transparent 55%), linear-gradient(145deg, #07261e 0%, #0c3b2e 42%, #0e1a24 100%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(rgba(244,247,245,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(244,247,245,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 75%)',
        }}
      />
      <div className="absolute -right-8 top-[8%] w-[58%] max-w-[520px] rotate-6 drop-shadow-[0_30px_60px_rgba(0,0,0,0.45)] md:right-[6%] md:w-[48%]">
        <Jersey primary="#FF5A1F" secondary="#0E1A24" number="07" accent="#F4F7F5" />
      </div>
      <div className="absolute left-[4%] top-[22%] w-[42%] max-w-[380px] -rotate-12 opacity-95 drop-shadow-[0_24px_40px_rgba(0,0,0,0.4)] md:left-[12%]">
        <Jersey primary="#F4F7F5" secondary="#0C3B2E" number="23" accent="#0C3B2E" />
      </div>
      <div className="absolute bottom-[6%] left-[28%] w-[36%] max-w-[320px] rotate-3 opacity-90 drop-shadow-[0_20px_30px_rgba(0,0,0,0.35)] md:left-[36%]">
        <Jersey primary="#1F8A5B" secondary="#07261E" number="11" accent="#F4F7F5" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-pitch-deep/80 to-transparent" />
    </div>
  )
}

export function DealJersey({
  primary,
  secondary,
  number,
  accent,
}: {
  primary: string
  secondary: string
  number: string
  accent?: string
}) {
  return (
    <Jersey
      className="mx-auto h-40 w-auto sm:h-48"
      primary={primary}
      secondary={secondary}
      number={number}
      accent={accent}
    />
  )
}
