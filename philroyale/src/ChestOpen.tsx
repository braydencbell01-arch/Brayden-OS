import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { getCharacter } from './characters'
import { CHEST_META, type ChestRarity } from './progression'
import { BattleCard } from './BattleCard'
import type { OwnedChest } from './storage'

export type ChestLoot = {
  gold: number
  gems?: number
  cards: { charId: string; copies: number; newlyUnlocked?: boolean }[]
  evoShards?: { charId: string; shards: number; unlockedEvo?: boolean }[]
  cosmetic?: { kind: string; label: string; rarity: string }
}

type InspectProps = {
  chest: OwnedChest
  now: number
  gold: number
  onClose: () => void
  onStartUnlock: () => void
  onOpenNow: () => void
  onOpenReady: () => void
}

function formatRemain(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${String(r).padStart(2, '0')}s`
  return `${r}s`
}

export function ChestArt({
  rarity,
  open = false,
  size = 'md',
  bounce = false,
}: {
  rarity: ChestRarity
  open?: boolean
  size?: 'sm' | 'md' | 'lg'
  bounce?: boolean
}) {
  const meta = CHEST_META[rarity]
  const dim = size === 'lg' ? 'h-40 w-40' : size === 'md' ? 'h-24 w-24' : 'h-14 w-14'
  const band =
    rarity === 'legendary'
      ? '#fff3a8'
      : rarity === 'epic'
        ? '#e0a0ff'
        : rarity === 'rare'
          ? '#ffc078'
          : '#e8eef5'

  return (
    <motion.div
      className={`relative ${dim}`}
      animate={
        bounce
          ? { y: [0, -10, 0], rotate: [0, -3, 3, 0] }
          : open
            ? { y: 0, rotate: 0 }
            : { y: [0, -4, 0] }
      }
      transition={
        bounce
          ? { duration: 0.45, repeat: Infinity, ease: 'easeInOut' }
          : open
            ? { duration: 0.2 }
            : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
      }
    >
      {/* Glow */}
      <div
        className="absolute inset-[-12%] rounded-full opacity-50 blur-md"
        style={{ background: meta.color }}
        aria-hidden
      />
      {/* Body */}
      <div
        className="absolute bottom-[8%] left-[12%] right-[12%] h-[58%] rounded-md"
        style={{
          background: `linear-gradient(180deg, ${meta.color}, #2a1a12)`,
          boxShadow: 'inset 0 2px 0 #ffffff44, 0 4px 0 #00000055',
          border: `2px solid ${band}`,
        }}
      />
      {/* Lid */}
      <motion.div
        className="absolute left-[10%] right-[10%] top-[10%] h-[38%] origin-bottom rounded-t-md"
        style={{
          background: `linear-gradient(180deg, ${band}, ${meta.color})`,
          boxShadow: 'inset 0 2px 0 #ffffff66',
          border: `2px solid ${band}`,
        }}
        animate={open ? { rotateX: -70, y: -8 } : { rotateX: 0, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 16 }}
      />
      {/* Lock / clasp */}
      <div
        className="absolute left-1/2 top-[42%] h-[18%] w-[22%] -translate-x-1/2 rounded-sm"
        style={{
          background: open ? '#5a4a20' : '#f5d76e',
          boxShadow: '0 2px 0 #8a6a12',
        }}
      />
    </motion.div>
  )
}

/** Clash-style inspect panel: Unlock / Open Now / Open */
export function ChestInspectModal({
  chest,
  now,
  gold,
  onClose,
  onStartUnlock,
  onOpenNow,
  onOpenReady,
}: InspectProps) {
  const meta = CHEST_META[chest.rarity]
  const ready = chest.readyAt != null && chest.readyAt <= now
  const unlocking = chest.unlockingStartedAt != null && !ready
  const locked = chest.unlockingStartedAt == null && !ready
  const remain = unlocking ? (chest.readyAt ?? now) - now : meta.unlockSec * 1000
  const canAfford = gold >= meta.openNowGold

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chest-inspect-title"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="w-full max-w-sm rounded-2xl p-4"
        style={{
          background: 'linear-gradient(180deg,#3a2418,#1a100c)',
          boxShadow: '0 16px 40px #00000099, inset 0 1px 0 #c9a22755',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p
          id="chest-inspect-title"
          className="text-center font-[family-name:var(--font-display)] text-2xl tracking-wide"
          style={{ color: meta.color }}
        >
          {meta.label}
        </p>
        <div className="mt-3 flex justify-center">
          <ChestArt rarity={chest.rarity} size="lg" bounce={ready} />
        </div>

        {ready ? (
          <p className="mt-3 text-center text-sm font-extrabold text-[#7dff9a]">
            Ready to open!
          </p>
        ) : unlocking ? (
          <p className="mt-3 text-center text-sm font-bold text-white/80">
            Unlocking · {formatRemain(remain)} left
          </p>
        ) : (
          <p className="mt-3 text-center text-sm font-bold text-white/80">
            Unlock time · {formatRemain(meta.unlockSec * 1000)}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2">
          {ready ? (
            <button
              type="button"
              onClick={onOpenReady}
              className="w-full rounded-xl py-3.5 text-lg font-extrabold uppercase tracking-wide text-[#1a1410]"
              style={{
                background: 'linear-gradient(180deg,#ffe08a,#c9a227)',
                boxShadow: '0 5px 0 #8a6a12',
              }}
            >
              Open
            </button>
          ) : null}

          {locked ? (
            <button
              type="button"
              onClick={onStartUnlock}
              className="w-full rounded-xl py-3.5 text-lg font-extrabold uppercase tracking-wide text-white"
              style={{
                background: 'linear-gradient(180deg,#4a9eff,#2f6fbf)',
                boxShadow: '0 5px 0 #1d4a86',
              }}
            >
              Unlock · {formatRemain(meta.unlockSec * 1000)}
            </button>
          ) : null}

          {(locked || unlocking) && !ready ? (
            <button
              type="button"
              onClick={onOpenNow}
              disabled={!canAfford}
              className="w-full rounded-xl py-3 text-base font-extrabold uppercase tracking-wide text-[#1a1410] disabled:opacity-45"
              style={{
                background: 'linear-gradient(180deg,#7dff9a,#2d9a4a)',
                boxShadow: canAfford ? '0 4px 0 #1b5e2a' : 'none',
              }}
            >
              Open now · {meta.openNowGold} gold
            </button>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg py-2.5 text-sm font-extrabold text-white/70"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  )
}

type RevealProps = {
  rarity: ChestRarity
  loot: ChestLoot
  onDone: () => void
}

type RevealStep =
  | { kind: 'closed' }
  | { kind: 'opening' }
  | { kind: 'gold' }
  | { kind: 'gems' }
  | { kind: 'card'; index: number }
  | { kind: 'shard'; index: number }
  | { kind: 'cosmetic' }
  | { kind: 'summary' }

function firstLootStep(loot: ChestLoot): RevealStep {
  if (loot.gold > 0) return { kind: 'gold' }
  if ((loot.gems ?? 0) > 0) return { kind: 'gems' }
  if (loot.cards.length) return { kind: 'card', index: 0 }
  if ((loot.evoShards ?? []).length) return { kind: 'shard', index: 0 }
  if (loot.cosmetic) return { kind: 'cosmetic' }
  return { kind: 'summary' }
}

function afterGold(loot: ChestLoot): RevealStep {
  if ((loot.gems ?? 0) > 0) return { kind: 'gems' }
  if (loot.cards.length) return { kind: 'card', index: 0 }
  if ((loot.evoShards ?? []).length) return { kind: 'shard', index: 0 }
  if (loot.cosmetic) return { kind: 'cosmetic' }
  return { kind: 'summary' }
}

function afterGems(loot: ChestLoot): RevealStep {
  if (loot.cards.length) return { kind: 'card', index: 0 }
  if ((loot.evoShards ?? []).length) return { kind: 'shard', index: 0 }
  if (loot.cosmetic) return { kind: 'cosmetic' }
  return { kind: 'summary' }
}

function afterCards(loot: ChestLoot, cardIndex: number): RevealStep {
  const next = cardIndex + 1
  if (next < loot.cards.length) return { kind: 'card', index: next }
  if ((loot.evoShards ?? []).length) return { kind: 'shard', index: 0 }
  if (loot.cosmetic) return { kind: 'cosmetic' }
  return { kind: 'summary' }
}

/** Full-screen CR chest open: tap closed chest → burst → rewards one by one. */
export function ChestRevealSequence({ rarity, loot, onDone }: RevealProps) {
  const [step, setStep] = useState<RevealStep>({ kind: 'closed' })
  const meta = CHEST_META[rarity]

  useEffect(() => {
    if (step.kind !== 'opening') return
    const id = window.setTimeout(() => setStep(firstLootStep(loot)), 700)
    return () => window.clearTimeout(id)
  }, [step.kind, loot])

  function advance() {
    if (step.kind === 'closed') {
      setStep({ kind: 'opening' })
      return
    }
    if (step.kind === 'opening') return
    if (step.kind === 'gold') {
      setStep(afterGold(loot))
      return
    }
    if (step.kind === 'gems') {
      setStep(afterGems(loot))
      return
    }
    if (step.kind === 'card') {
      setStep(afterCards(loot, step.index))
      return
    }
    if (step.kind === 'shard') {
      const next = step.index + 1
      const shards = loot.evoShards ?? []
      if (next < shards.length) setStep({ kind: 'shard', index: next })
      else setStep(loot.cosmetic ? { kind: 'cosmetic' } : { kind: 'summary' })
      return
    }
    if (step.kind === 'cosmetic') {
      setStep({ kind: 'summary' })
      return
    }
    onDone()
  }

  const cardDrop =
    step.kind === 'card' ? loot.cards[step.index] : null
  const cardDef = cardDrop ? getCharacter(cardDrop.charId) : null
  const shardDrop =
    step.kind === 'shard' ? (loot.evoShards ?? [])[step.index] : null
  const shardDef = shardDrop ? getCharacter(shardDrop.charId) : null

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center"
      style={{
        background:
          'radial-gradient(ellipse 80% 60% at 50% 40%, #3a2418 0%, #0a0604 70%)',
      }}
      onClick={advance}
      role="dialog"
      aria-modal="true"
    >
      <p
        className="mb-2 font-[family-name:var(--font-display)] text-2xl tracking-wide"
        style={{ color: meta.color }}
      >
        {meta.label}
      </p>

      <AnimatePresence mode="wait">
        {(step.kind === 'closed' || step.kind === 'opening') && (
          <motion.div
            key="chest"
            className="flex flex-col items-center"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
          >
            <ChestArt
              rarity={rarity}
              size="lg"
              open={step.kind === 'opening'}
              bounce={step.kind === 'closed'}
            />
            {step.kind === 'closed' ? (
              <p className="mt-4 animate-pulse text-sm font-extrabold uppercase tracking-widest text-[#f5d76e]">
                Tap to open
              </p>
            ) : (
              <motion.div
                className="mt-2 h-24 w-24 rounded-full"
                initial={{ scale: 0.2, opacity: 1 }}
                animate={{ scale: 3, opacity: 0 }}
                style={{ background: meta.color }}
              />
            )}
          </motion.div>
        )}

        {step.kind === 'gold' ? (
          <motion.div
            key="gold"
            className="flex flex-col items-center"
            initial={{ scale: 0.5, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
          >
            <div
              className="flex h-28 w-28 items-center justify-center rounded-full text-4xl font-black text-[#1a1410]"
              style={{
                background: 'linear-gradient(180deg,#ffe08a,#c9a227)',
                boxShadow: '0 8px 0 #8a6a12, 0 0 30px #f5d76e88',
              }}
            >
              ●
            </div>
            <p className="mt-4 font-[family-name:var(--font-display)] text-4xl text-[#f5d76e]">
              +{loot.gold}
            </p>
            <p className="text-sm font-extrabold uppercase tracking-wide text-white/70">
              Gold
            </p>
            <p className="mt-6 text-xs font-bold text-white/50">Tap to continue</p>
          </motion.div>
        ) : null}

        {step.kind === 'gems' ? (
          <motion.div
            key="gems"
            className="flex flex-col items-center"
            initial={{ scale: 0.5, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
          >
            <div
              className="flex h-28 w-28 items-center justify-center rounded-full text-4xl font-black text-white"
              style={{
                background: 'linear-gradient(180deg,#9ae8ff,#2f8fd6)',
                boxShadow: '0 8px 0 #1a4a78, 0 0 30px #5ad0ff88',
              }}
            >
              ◆
            </div>
            <p className="mt-4 font-[family-name:var(--font-display)] text-4xl text-[#9ae8ff]">
              +{loot.gems ?? 0}
            </p>
            <p className="text-sm font-extrabold uppercase tracking-wide text-white/70">
              Gems
            </p>
            <p className="mt-6 text-xs font-bold text-white/50">Tap to continue</p>
          </motion.div>
        ) : null}

        {step.kind === 'card' && cardDef && cardDrop ? (
          <motion.div
            key={`card-${step.index}`}
            className="flex flex-col items-center"
            initial={{ scale: 0.4, rotate: -12, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
          >
            <div className="w-36">
              <BattleCard character={cardDef} size="collection" />
            </div>
            <p className="mt-3 font-[family-name:var(--font-display)] text-2xl text-[#f5d76e]">
              {cardDef.name}
            </p>
            <p className="text-lg font-extrabold text-white">×{cardDrop.copies}</p>
            {cardDrop.newlyUnlocked ? (
              <p className="mt-1 font-[family-name:var(--font-display)] text-xl tracking-wide text-[#7dff9a]">
                Unlocked!
              </p>
            ) : null}
            <p className="mt-6 text-xs font-bold text-white/50">Tap to continue</p>
          </motion.div>
        ) : null}

        {step.kind === 'shard' && shardDef && shardDrop ? (
          <motion.div
            key={`shard-${step.index}`}
            className="flex flex-col items-center"
            initial={{ scale: 0.4, rotate: 8, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
          >
            <div className="relative w-36">
              <BattleCard character={shardDef} size="collection" evolved />
              <div
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
                aria-hidden
              >
                <span
                  className="block h-10 w-10 rotate-45"
                  style={{
                    background: 'linear-gradient(135deg,#e9b8ff,#9b2dff 45%,#5a00a8)',
                    boxShadow: '0 0 18px #c060ffcc',
                  }}
                />
              </div>
            </div>
            <p className="mt-3 font-[family-name:var(--font-display)] text-2xl text-[#e9b8ff]">
              {shardDef.name}
            </p>
            <p className="text-lg font-extrabold text-white">
              ×{shardDrop.shards} evo shard{shardDrop.shards === 1 ? '' : 's'}
            </p>
            {shardDrop.unlockedEvo ? (
              <p className="mt-1 font-[family-name:var(--font-display)] text-xl tracking-wide text-[#c080ff]">
                Evolution unlocked!
              </p>
            ) : null}
            <p className="mt-6 text-xs font-bold text-white/50">Tap to continue</p>
          </motion.div>
        ) : null}

        {step.kind === 'cosmetic' && loot.cosmetic ? (
          <motion.div
            key="cosmetic"
            className="flex flex-col items-center"
            initial={{ scale: 0.5, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
          >
            <div
              className="flex h-24 w-24 items-center justify-center rounded-2xl text-4xl"
              style={{
                background: 'linear-gradient(180deg,#ffe08a,#c9a227)',
                boxShadow: '0 8px 0 #8a6a12, 0 0 24px #f5d76e88',
              }}
            >
              ✨
            </div>
            <p className="mt-4 font-[family-name:var(--font-display)] text-2xl text-[#f5d76e]">
              {loot.cosmetic.label}
            </p>
            <p className="text-sm font-extrabold uppercase tracking-wide text-white/70">
              {loot.cosmetic.rarity} {loot.cosmetic.kind}
            </p>
            <p className="mt-6 text-xs font-bold text-white/50">Tap to continue</p>
          </motion.div>
        ) : null}

        {step.kind === 'summary' ? (
          <motion.div
            key="summary"
            className="flex w-full max-w-xs flex-col items-center px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="font-[family-name:var(--font-display)] text-3xl text-[#f5d76e]">
              Loot!
            </p>
            <ul className="mt-3 w-full space-y-1.5">
              {loot.gold > 0 ? (
                <li className="rounded-lg bg-[#2a1a12] px-3 py-2 text-center text-sm font-extrabold text-[#f5d76e] ring-1 ring-white/10">
                  +{loot.gold} gold
                </li>
              ) : null}
              {(loot.gems ?? 0) > 0 ? (
                <li className="rounded-lg bg-[#2a1a12] px-3 py-2 text-center text-sm font-extrabold text-[#9ae8ff] ring-1 ring-white/10">
                  +{loot.gems} gems
                </li>
              ) : null}
              {loot.cards.map((d) => {
                const c = getCharacter(d.charId)
                return (
                  <li
                    key={`${d.charId}-${d.copies}`}
                    className="rounded-lg bg-[#2a1a12] px-3 py-2 text-center text-sm font-extrabold text-white ring-1 ring-white/10"
                  >
                    {d.copies}× {c?.name ?? d.charId}
                    {d.newlyUnlocked ? (
                      <span className="mt-0.5 block text-xs font-extrabold uppercase tracking-wide text-[#7dff9a]">
                        Unlocked!
                      </span>
                    ) : null}
                  </li>
                )
              })}
              {(loot.evoShards ?? []).map((d) => {
                const c = getCharacter(d.charId)
                return (
                  <li
                    key={`evo-${d.charId}-${d.shards}`}
                    className="rounded-lg bg-[#1a1020] px-3 py-2 text-center text-sm font-extrabold text-[#e9b8ff] ring-1 ring-[#9b2dff66]"
                  >
                    {d.shards}× {c?.name ?? d.charId} evo shard
                    {d.unlockedEvo ? (
                      <span className="mt-0.5 block text-xs font-extrabold uppercase tracking-wide text-[#c080ff]">
                        Evolution unlocked!
                      </span>
                    ) : null}
                  </li>
                )
              })}
              {loot.cosmetic ? (
                <li className="rounded-lg bg-[#2a1a12] px-3 py-2 text-center text-sm font-extrabold text-[#f5d76e] ring-1 ring-[#c9a22766]">
                  {loot.cosmetic.label}
                  <span className="mt-0.5 block text-xs font-extrabold uppercase tracking-wide text-white/60">
                    {loot.cosmetic.rarity} {loot.cosmetic.kind}
                  </span>
                </li>
              ) : null}
            </ul>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDone()
              }}
              className="mt-5 w-full rounded-xl py-3.5 text-lg font-extrabold uppercase tracking-wide text-[#1a1410]"
              style={{
                background: 'linear-gradient(180deg,#ffe08a,#c9a227)',
                boxShadow: '0 5px 0 #8a6a12',
              }}
            >
              Continue
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
