import type { ReactNode } from 'react'
import type { AttackId } from '../characters'
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
import { FaggolModel } from './FaggolModel'

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
  } else if (charId === 'faggol') {
    model = (
      <FaggolModel
        anim={anim}
        facing={facing}
        attackId={attackId}
        portrait={portrait}
        enraged={enraged}
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
  if (!enraged) return model
  return (
    <div
      className="relative h-full w-full"
      style={{
        filter: 'hue-rotate(270deg) saturate(1.9) brightness(1.08) contrast(1.1)',
      }}
    >
      {model}
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
