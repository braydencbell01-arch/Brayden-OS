type LogoProps = {
  className?: string
  title?: string
}

/** Circular Jersey Deals mark — matches brand logo (serif wordmark inside ring). */
export function Logo({ className, title = 'Jersey Deals' }: LogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 320 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <defs>
        <path id="deals-arc" d="M 58 248 A 118 118 0 0 0 262 248" />
      </defs>

      {/* Cream badge + navy ring */}
      <circle cx="160" cy="160" r="152" fill="#FCF5E9" stroke="#0B223F" strokeWidth="8" />

      {/* Red jersey */}
      <path
        d="M108 72c10-18 30-26 52-26s42 8 52 26l22 10 12 28-30 14v78c0 7-5 12-12 12H128c-7 0-12-5-12-12v-78L86 110l12-28 10-10z"
        fill="#D7282F"
        stroke="#0B223F"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />

      {/* White V-neck collar */}
      <path
        d="M132 68c8-6 18-10 28-10s20 4 28 10l6 5-10 12c-7-5-15-8-24-8s-17 3-24 8l-10-12 6-5z"
        fill="#FFFFFF"
        stroke="#0B223F"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M148 82l12 16 12-16"
        stroke="#0B223F"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Left sleeve white double stripes */}
      <path
        d="M86 110l12-28 18 8-7 22-23-2z"
        fill="#FFFFFF"
        stroke="#0B223F"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M92 98h20M90 108h22" stroke="#0B223F" strokeWidth="3.5" strokeLinecap="round" />

      {/* Right sleeve white double stripes */}
      <path
        d="M234 110l-12-28-18 8 7 22 23-2z"
        fill="#FFFFFF"
        stroke="#0B223F"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M208 98h20M208 108h22" stroke="#0B223F" strokeWidth="3.5" strokeLinecap="round" />

      {/* JERSEY — straight, inside circle */}
      <text
        x="160"
        y="228"
        textAnchor="middle"
        fill="#0B223F"
        fontFamily="Libre Baskerville, Georgia, 'Times New Roman', serif"
        fontSize="28"
        fontWeight="700"
        letterSpacing="4"
      >
        JERSEY
      </text>

      {/* DEALS — curved along bottom of ring */}
      <text
        fill="#0B223F"
        fontFamily="Libre Baskerville, Georgia, 'Times New Roman', serif"
        fontSize="26"
        fontWeight="700"
        letterSpacing="5"
      >
        <textPath href="#deals-arc" startOffset="50%" textAnchor="middle">
          DEALS
        </textPath>
      </text>
    </svg>
  )
}
