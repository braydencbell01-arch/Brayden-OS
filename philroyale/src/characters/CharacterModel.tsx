import type { ReactNode } from 'react'
import type { AttackId } from '../characters'
import { getCharacter, isHumanBattlefieldCard } from '../characters'
import { BeansModel } from './BeansModel'
import { CrUnitModel } from './CrUnitModel'
import { DanModel } from './DanModel'
import { FinleyModel } from './FinleyModel'
import { JeremyModel } from './JeremyModel'
import { KathieModel } from './KathieModel'
import { LynneModel } from './LynneModel'
import { MikeModel } from './MikeModel'
import { PeteModel } from './PeteModel'
import { PhilModel, type CharacterAnim } from './PhilModel'
import { ShayModel } from './ShayModel'
import { ToddModel } from './ToddModel'
import { DogHutModel } from './DogHutModel'
import { PhilsCarModel } from './PhilsCarModel'
import { ScottModel } from './ScottModel'
import { IceCreamModel } from './IceCreamModel'
import { BaseballModel } from './BaseballModel'
import { BobbySpecialModel } from './BobbySpecialModel'
import { GretchinModel } from './GretchinModel'
import { DaveModel } from './DaveModel'
import { PhilSpiritModel } from './PhilSpiritModel'
import { PeteSpiritModel } from './PeteSpiritModel'
import { JeremySpiritModel } from './JeremySpiritModel'
import { EvilPhilModel } from './EvilPhilModel'
import { StevesDinerModel } from './StevesDinerModel'
import { BigMableModel } from './BigMableModel'
import { HamburgerChickenModel } from './HamburgerChickenModel'
import { ChickenModel } from './ChickenModel'
import { ChickenBarrelModel } from './ChickenBarrelModel'
import { TristanModel } from './TristanModel'
import { BerryModel } from './BerryModel'
import { SusanModel } from './SusanModel'
import { PhilsRocketModel } from './PhilsRocketModel'
import { CoachGrafModel } from './CoachGrafModel'
import { PhotoTroop } from './PhotoTroop'
import { BocceBallModel } from './BocceBallModel'

type Props = {
  charId: string
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
  hue?: number
  initial?: string
  enraged?: boolean
  auraActive?: boolean
  /** Swarm index — bocce green (0, left) vs red (1, right). */
  spawnIdx?: number
}

/** Routes to Clash Royale–style toy-3D character models. */
export function CharacterModel({
  charId,
  anim,
  facing,
  attackId,
  portrait,
  enraged,
  auraActive,
  spawnIdx,
}: Props) {
  let model: ReactNode
  if (charId === 'phil') {
    model = <PhilModel anim={anim} facing={facing} attackId={attackId} portrait={portrait} />
  } else if (charId === 'kathie') {
    model = <KathieModel anim={anim} facing={facing} attackId={attackId} portrait={portrait} />
  } else if (charId === 'todd') {
    model = <ToddModel anim={anim} facing={facing} attackId={attackId} portrait={portrait} />
  } else if (charId === 'mike') {
    model = <MikeModel anim={anim} facing={facing} attackId={attackId} portrait={portrait} />
  } else if (charId === 'lynne') {
    model = <LynneModel anim={anim} facing={facing} attackId={attackId} portrait={portrait} />
  } else if (charId === 'dan') {
    // Pete — Death Hug (PeteModel art)
    model = <PeteModel anim={anim} facing={facing} attackId={attackId} portrait={portrait} />
  } else if (charId === 'pete') {
    // Chuck — human shield + Suplex (DanModel art)
    model = (
      <DanModel anim={anim} facing={facing} attackId={attackId} portrait={portrait} />
    )
  } else if (charId === 'beans') {
    model = <BeansModel anim={anim} facing={facing} attackId={attackId} portrait={portrait} />
  } else if (charId === 'finley') {
    model = <FinleyModel anim={anim} facing={facing} portrait={portrait} />
  } else if (charId === 'shay') {
    model = <ShayModel anim={anim} facing={facing} portrait={portrait} />
  } else if (charId === 'jeremy') {
    model = <JeremyModel anim={anim} facing={facing} attackId={attackId} portrait={portrait} />
  } else if (charId === 'scott') {
    model = <ScottModel anim={anim} facing={facing} attackId={attackId} portrait={portrait} />
  } else if (charId === 'gretchin') {
    model = <GretchinModel anim={anim} facing={facing} attackId={attackId} portrait={portrait} />
  } else if (charId === 'dave') {
    model = <DaveModel anim={anim} facing={facing} attackId={attackId} portrait={portrait} />
  } else if (charId === 'coachGraf') {
    model = (
      <CoachGrafModel anim={anim} facing={facing} attackId={attackId} portrait={portrait} />
    )
  } else if (charId === 'philSpirit') {
    model = <PhilSpiritModel anim={anim} facing={facing} attackId={attackId} portrait={portrait} />
  } else if (charId === 'peteSpirit') {
    model = <PeteSpiritModel anim={anim} facing={facing} attackId={attackId} portrait={portrait} />
  } else if (charId === 'jeremySpirit') {
    model = (
      <JeremySpiritModel anim={anim} facing={facing} attackId={attackId} portrait={portrait} />
    )
  } else if (charId === 'evilPhil') {
    model = <EvilPhilModel anim={anim} facing={facing} attackId={attackId} portrait={portrait} />
  } else if (charId === 'dogHut') {
    model = <DogHutModel anim={anim} facing={facing} portrait={portrait} />
  } else if (charId === 'philsCar') {
    model = (
      <PhilsCarModel anim={anim} facing={facing} attackId={attackId} portrait={portrait} />
    )
  } else if (charId === 'philsRocket') {
    model = <PhilsRocketModel anim={anim} facing={facing} portrait={portrait} />
  } else if (charId === 'stevesDiner') {
    model = (
      <StevesDinerModel anim={anim} facing={facing} attackId={attackId} portrait={portrait} />
    )
  } else if (charId === 'iceCream') {
    model = <IceCreamModel anim={anim} facing={facing} portrait={portrait} />
  } else if (charId === 'footballHuck') {
    model = <BaseballModel anim={anim} facing={facing} portrait={portrait} />
  } else if (charId === 'bobbySpecial') {
    model = <BobbySpecialModel anim={anim} facing={facing} portrait={portrait} />
  } else if (charId === 'bigMable') {
    model = (
      <BigMableModel anim={anim} facing={facing} attackId={attackId} portrait={portrait} />
    )
  } else if (charId === 'hamburgerChicken') {
    model = (
      <HamburgerChickenModel anim={anim} facing={facing} attackId={attackId} portrait={portrait} />
    )
  } else if (charId === 'chicken') {
    model = (
      <ChickenModel anim={anim} facing={facing} attackId={attackId} portrait={portrait} />
    )
  } else if (charId === 'chickenArmy') {
    model = (
      <ChickenModel anim={anim} facing={facing} attackId={attackId} portrait={portrait} army />
    )
  } else if (charId === 'chickenBarrel') {
    model = <ChickenBarrelModel anim={anim} facing={facing} portrait={portrait} />
  } else if (charId === 'tristan') {
    model = (
      <TristanModel anim={anim} facing={facing} attackId={attackId} portrait={portrait} />
    )
  } else if (charId === 'berry') {
    model = (
      <BerryModel
        anim={anim}
        facing={facing}
        attackId={attackId}
        portrait={portrait}
        auraActive={auraActive}
      />
    )
  } else if (charId === 'susan') {
    model = (
      <SusanModel
        anim={anim}
        facing={facing}
        attackId={attackId}
        portrait={portrait}
        auraActive={auraActive}
      />
    )
  } else if (charId === 'coolWhip') {
    model = (
      <PhotoTroop
        cardSrc={`${import.meta.env.BASE_URL}characters/cool-whip-card.png`}
        troopSrc={`${import.meta.env.BASE_URL}characters/cool-whip-troop.png`}
        alt="Cool Whip"
        anim={anim}
        facing={facing}
        portrait={portrait}
        gait="waddle"
        attack="none"
        spriteLegs
        troopScale={1.08}
      />
    )
  } else if (charId === 'bocceBalls') {
    model = <BocceBallModel anim={anim} facing={facing} portrait={portrait} spawnIdx={spawnIdx} />
  } else if (charId === 'georgesDiner') {
    model = (
      <PhotoTroop
        cardSrc={`${import.meta.env.BASE_URL}characters/georges-diner-card.png`}
        troopSrc={`${import.meta.env.BASE_URL}characters/georges-diner-troop.png`}
        alt="George's Diner"
        anim={anim}
        facing={facing}
        portrait={portrait}
        spriteLegs
        troopScale={1.06}
        gait="stiff"
        attack="none"
      />
    )
  } else if (charId === 'olReliable') {
    model = (
      <PhotoTroop
        cardSrc={`${import.meta.env.BASE_URL}characters/ol-reliable-card.png`}
        troopSrc={`${import.meta.env.BASE_URL}characters/ol-reliable-troop.png`}
        alt="Ol' Reliable"
        anim={anim}
        facing={facing}
        portrait={portrait}
        spriteLegs
        gait="stiff"
        troopScale={1.04}
        attack="none"
      />
    )
  } else if (charId === 'stalwart') {
    model = (
      <PhotoTroop
        cardSrc={`${import.meta.env.BASE_URL}characters/stalwart-card.png`}
        troopSrc={`${import.meta.env.BASE_URL}characters/stalwart-troop.png`}
        alt="Stalwart"
        anim={anim}
        facing={facing}
        portrait={portrait}
        spriteLegs
        gait="stiff"
        troopScale={1.04}
        attack="none"
      />
    )
  } else if (charId === 'tentacool') {
    model = (
      <PhotoTroop
        cardSrc={`${import.meta.env.BASE_URL}characters/tentacool-card.png`}
        troopSrc={`${import.meta.env.BASE_URL}characters/tentacool-troop.png`}
        alt="Tentacool"
        anim={anim}
        facing={facing}
        portrait={portrait}
        gait="stiff"
        spriteLegs
        troopScale={1.12}
        attack="none"
      />
    )
  } else {
    model = (
      <CrUnitModel
        anim={anim}
        facing={facing}
        portrait={portrait}
        build="speedy"
        shirt="#5a8ab0"
        shirtDark="#1a3a58"
        pants="#3a3a48"
        pantsDark="#1a1a22"
        accent="#f5d76e"
        hair="#4a3a28"
      />
    )
  }

  // Rage lasts until death. Every troop turns clearly purple while enraged.
  const def = getCharacter(charId)
  const thicker =
    !portrait && isHumanBattlefieldCard(charId, def?.cardKind)
  let out: ReactNode = thicker ? (
    <div
      className="relative h-full w-full"
      style={{
        transform: 'scaleX(1.28)',
        transformOrigin: '50% 100%',
      }}
    >
      {model}
    </div>
  ) : (
    model
  )
  if (!enraged) return out
  return (
    <div
      className="relative h-full w-full"
      style={{
        filter: 'hue-rotate(270deg) saturate(1.9) brightness(1.08) contrast(1.1)',
      }}
    >
      {out}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 40%, #d080ff88 0%, #9020ff44 45%, transparent 72%)',
          mixBlendMode: 'screen',
        }}
        aria-hidden
      />
    </div>
  )
}

export type { CharacterAnim }
