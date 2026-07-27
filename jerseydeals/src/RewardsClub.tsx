import { motion, useReducedMotion } from 'framer-motion'
import { RewardsSectionJoin } from './RewardsJoinForm'

function fadeUp(reduce: boolean | null, delay = 0) {
  const ease = [0.22, 1, 0.36, 1] as const
  return {
    initial: reduce ? false : { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.25 },
    transition: { duration: 0.6, delay: reduce ? 0 : delay, ease },
  }
}

export function RewardsClub() {
  const reduce = useReducedMotion()

  return (
    <section id="rewards" className="scroll-mt-44 border-y-2 border-crimson/30 bg-navy py-20 text-cream md:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 md:grid-cols-12 md:items-end md:px-8">
        <motion.div {...fadeUp(reduce)} className="md:col-span-6">
          <p className="eyebrow text-crimson-hot">Members</p>
          <div className="brand-rule mt-3" aria-hidden />
          <h2 className="mt-4 font-display text-4xl font-bold uppercase tracking-wide text-cream md:text-5xl">
            Jersey Deals Rewards Club
          </h2>
          <p className="mt-3 max-w-md font-brand text-base leading-relaxed text-cream/80">
            Drop your email or phone for special offers, restocks, and member-only drops. Orders{' '}
            <span className="text-cream">$100+</span> ship free.
          </p>
        </motion.div>

        <motion.div {...fadeUp(reduce, 0.08)} className="md:col-span-6">
          <RewardsSectionJoin />
        </motion.div>
      </div>
    </section>
  )
}
