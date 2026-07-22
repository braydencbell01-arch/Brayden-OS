import { motion } from 'framer-motion'

export function PlaceholderScreen({
  title,
  reduce,
}: {
  title: string
  reduce: boolean | null
}) {
  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 45% at 50% 0%, rgba(20,107,74,0.5), transparent 55%), linear-gradient(180deg, #06261c 0%, #0b3d2e 100%)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 pitch-grid opacity-30" aria-hidden />

      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-5 pb-28 pt-screen md:max-w-xl md:px-6">
        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-6xl tracking-[0.06em] text-cream sm:text-7xl"
        >
          {title}
        </motion.h1>
        <p className="mt-3 text-sm text-mist/70">Coming soon</p>
      </div>
    </div>
  )
}
