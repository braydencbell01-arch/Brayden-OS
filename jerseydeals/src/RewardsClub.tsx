import { motion, useReducedMotion } from 'framer-motion'
import { RewardsSectionJoin } from './RewardsJoinForm'

function fadeUp(reduce: boolean | null, delay = 0) {
  const ease = [0.22, 1, 0.36, 1] as const
  return {
    initial: reduce ? false : { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.25 },
    transition: { duration: 0.45, delay: reduce ? 0 : delay, ease },
  }
}

export function RewardsClub() {
  const reduce = useReducedMotion()

  return (
    <section id="rewards" className="scroll-mt-44 border-y border-crimson/30 bg-navy py-8 text-cream md:py-10">
      <div className="mx-auto grid max-w-6xl gap-5 px-5 md:grid-cols-12 md:items-center md:gap-8 md:px-8">
        <motion.div {...fadeUp(reduce)} className="md:col-span-5">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-crimson-hot">
            Members
          </p>
          <h2 className="mt-1.5 font-display text-2xl font-bold uppercase tracking-wide text-cream md:text-3xl">
            Jersey Deals Rewards Club
          </h2>
          <p className="mt-1.5 max-w-md font-brand text-sm leading-snug text-cream/75">
            Free to join — email or phone for offers, restocks, and member drops.
          </p>
        </motion.div>

        <motion.div {...fadeUp(reduce, 0.06)} className="md:col-span-7">
          <RewardsSectionJoin compact />
        </motion.div>
      </div>
    </section>
  )
}
