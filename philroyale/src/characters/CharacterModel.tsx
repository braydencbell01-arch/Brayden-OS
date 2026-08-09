import type { AttackId } from '../characters'
import { BeansModel } from './BeansModel'
import { CrUnitModel } from './CrUnitModel'
import { FinleyModel } from './FinleyModel'
import { JeremyModel } from './JeremyModel'
import { KathieModel } from './KathieModel'
import { PeteModel } from './PeteModel'
import { PhilModel, type CharacterAnim } from './PhilModel'
import { ToddModel } from './ToddModel'

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

  if (charId === 'kathie') {
    return <KathieModel anim={anim} facing={facing} attackId={attackId} portrait={portrait} />
  }

  if (charId === 'todd') {
    return <ToddModel anim={anim} facing={facing} attackId={attackId} portrait={portrait} />
  }

  if (charId === 'pete') {
    return <PeteModel anim={anim} facing={facing} attackId={attackId} portrait={portrait} />
  }

  if (charId === 'beans') {
    return <BeansModel anim={anim} facing={facing} attackId={attackId} portrait={portrait} />
  }

  if (charId === 'finley') {
    return (
      <FinleyModel anim={anim} facing={facing} portrait={portrait} enraged={enraged} />
    )
  }

  if (charId === 'jeremy') {
    return <JeremyModel anim={anim} facing={facing} attackId={attackId} portrait={portrait} />
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
