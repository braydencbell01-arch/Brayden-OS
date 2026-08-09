import type { AttackId } from '../characters'
import { CrUnitModel } from './CrUnitModel'
import { PhilModel, type CharacterAnim } from './PhilModel'

type Props = {
  charId: string
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
  hue?: number
  initial?: string
  enraged?: boolean
}

/** Routes to Clash Royale–style toy-3D character models. */
export function CharacterModel({
  charId,
  anim,
  facing,
  attackId,
  portrait,
  enraged,
}: Props) {
  if (charId === 'phil') {
    return <PhilModel anim={anim} facing={facing} attackId={attackId} portrait={portrait} />
  }

  if (charId === 'pete') {
    return (
      <CrUnitModel
        anim={anim}
        facing={facing}
        portrait={portrait}
        build="hulk"
        shirt="#e07030"
        shirtDark="#8a3010"
        pants="#3a3a48"
        pantsDark="#1a1a22"
        accent="#f5d76e"
        hair="#3a2818"
        hat="bandana"
      />
    )
  }

  if (charId === 'beans') {
    return (
      <CrUnitModel
        anim={anim}
        facing={facing}
        portrait={portrait}
        build="small"
        shirt="#c89050"
        shirtDark="#6a4020"
        pants="#5a7a3a"
        pantsDark="#2a4018"
        accent="#8bc34a"
        hair="#5a3a20"
        hat="none"
        prop="drool"
      />
    )
  }

  if (charId === 'finley') {
    return (
      <CrUnitModel
        anim={anim}
        facing={facing}
        portrait={portrait}
        enraged={enraged}
        build="speedy"
        shirt="#2ab8a0"
        shirtDark="#0a6858"
        pants="#2a3a58"
        pantsDark="#121828"
        accent="#a040ff"
        hair="#1a2a40"
        hat="visor"
        prop="fangs"
      />
    )
  }

  if (charId === 'jeremy') {
    return (
      <CrUnitModel
        anim={anim}
        facing={facing}
        portrait={portrait}
        build="shooter"
        shirt="#5aaa40"
        shirtDark="#2a6018"
        pants="#4a4a58"
        pantsDark="#22222a"
        accent="#c9a227"
        hair="#c8b090"
        hat="cap"
        prop="gun"
      />
    )
  }

  return (
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

export type { CharacterAnim }
