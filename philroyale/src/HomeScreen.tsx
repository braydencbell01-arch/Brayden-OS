import { motion } from 'framer-motion'

type Props = {
  onPlay: () => void
}

export function HomeScreen({ onPlay }: Props) {
  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 90% 55% at 50% 18%, #4a9a68 0%, transparent 55%),
            radial-gradient(ellipse 70% 40% at 20% 80%, #2a6f9e33 0%, transparent 50%),
            linear-gradient(180deg, #24553a 0%, #1a3d2e 45%, #122818 100%)
          `,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 27px,
              #e8c547 27px,
              #e8c547 28px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 27px,
              #e8c547 27px,
              #e8c547 28px
            )
          `,
          maskImage: 'linear-gradient(180deg, transparent 0%, black 30%, black 70%, transparent 100%)',
        }}
      />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-10 pt-[max(2rem,env(safe-area-inset-top))]">
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="flex flex-col items-center text-center"
        >
          <motion.div
            aria-hidden
            animate={{ rotate: [-4, 4, -4], y: [0, -4, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#122018]/80 shadow-[0_12px_28px_#00000055] ring-2 ring-[#e8c547]/70"
          >
            <svg viewBox="0 0 64 64" className="h-14 w-14" aria-hidden>
              <path
                d="M32 8l7 14h15l-12 9 5 15-15-10-15 10 5-15-12-9h15z"
                fill="#e8c547"
              />
              <rect x="24" y="44" width="16" height="10" rx="2" fill="#c45c26" />
            </svg>
          </motion.div>

          <h1
            className="font-[family-name:var(--font-display)] text-[clamp(3.2rem,12vw,5.5rem)] leading-[0.95] tracking-wide text-[#e8c547]"
            style={{ textShadow: '0 4px 0 #8a6a12, 0 10px 24px #00000066' }}
          >
            Phil
            <br />
            Royale
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mt-4 max-w-[18rem] text-base font-semibold leading-snug text-[#d8e7dc]/90"
          >
            Three towers. Classic lanes. Your characters coming soon.
          </motion.p>
        </motion.div>

        <motion.button
          type="button"
          onClick={onPlay}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, type: 'spring', stiffness: 280, damping: 20 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="mt-10 min-w-[12.5rem] rounded-xl bg-[#e8c547] px-10 py-4 text-xl font-extrabold uppercase tracking-wider text-[#122018] shadow-[0_6px_0_#8a6a12,0_14px_28px_#00000055] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f0d56a]"
        >
          Play
        </motion.button>
      </main>
    </div>
  )
}
