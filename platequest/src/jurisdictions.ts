/** US state / territory plate metadata for PlateQuest lookups. */
export type Jurisdiction = {
  code: string
  name: string
  slogan?: string
  rarity: 'common' | 'uncommon' | 'rare' | 'very-rare'
  notes: string
}

export const JURISDICTIONS: Jurisdiction[] = [
  { code: 'AL', name: 'Alabama', slogan: 'Sweet Home Alabama', rarity: 'common', notes: 'Heart of Dixie plates still circulate alongside newer designs.' },
  { code: 'AK', name: 'Alaska', slogan: 'The Last Frontier', rarity: 'rare', notes: 'Gold-on-blue classic look; scarce outside the Pacific Northwest.' },
  { code: 'AZ', name: 'Arizona', slogan: 'Grand Canyon State', rarity: 'common', notes: 'Cactus graphics and red serials are easy roadside tells.' },
  { code: 'AR', name: 'Arkansas', slogan: 'The Natural State', rarity: 'uncommon', notes: 'Diamond motif nods to natural resources.' },
  { code: 'CA', name: 'California', slogan: 'DMV', rarity: 'common', notes: 'Blue-on-white is the most spotted plate in many western states.' },
  { code: 'CO', name: 'Colorado', slogan: 'Colorful Colorado', rarity: 'common', notes: 'Green mountains graphic is a quick ID.' },
  { code: 'CT', name: 'Connecticut', slogan: 'Constitution State', rarity: 'uncommon', notes: 'Often seen along the Northeast corridor.' },
  { code: 'DE', name: 'Delaware', slogan: 'The First State', rarity: 'uncommon', notes: 'Black-gold classics are collector favorites.' },
  { code: 'FL', name: 'Florida', slogan: 'Sunshine State', rarity: 'common', notes: 'Orange blossom and specialty plates are everywhere in the Southeast.' },
  { code: 'GA', name: 'Georgia', slogan: 'Peach State', rarity: 'common', notes: 'Peach graphic variants are common on I-75 / I-85.' },
  { code: 'HI', name: 'Hawaii', slogan: 'Aloha State', rarity: 'very-rare', notes: 'Rainbow plates rarely leave the islands.' },
  { code: 'ID', name: 'Idaho', slogan: 'Famous Potatoes', rarity: 'uncommon', notes: 'Potato slogan makes ID nearly unmistakable.' },
  { code: 'IL', name: 'Illinois', slogan: 'Land of Lincoln', rarity: 'common', notes: 'Blue Lincoln silhouette is a Midwest staple.' },
  { code: 'IN', name: 'Indiana', slogan: 'Hoosier State', rarity: 'common', notes: 'Often paired with farm / sports specialty plates.' },
  { code: 'IA', name: 'Iowa', slogan: 'Hawkeye State', rarity: 'uncommon', notes: 'Simple blue serials; county stickers help confirm.' },
  { code: 'KS', name: 'Kansas', slogan: 'Sunflower State', rarity: 'uncommon', notes: 'Sunflower graphic is the giveaway.' },
  { code: 'KY', name: 'Kentucky', slogan: 'Bluegrass State', rarity: 'common', notes: 'Bluegrass branding dominates passenger plates.' },
  { code: 'LA', name: 'Louisiana', slogan: 'Sportsman\'s Paradise', rarity: 'common', notes: 'Pelican graphic; common along the Gulf.' },
  { code: 'ME', name: 'Maine', slogan: 'Vacationland', rarity: 'uncommon', notes: 'Chickadee / lobster themes travel with summer traffic.' },
  { code: 'MD', name: 'Maryland', slogan: 'Old Line State', rarity: 'common', notes: 'Shield and crab motifs are frequent near DC / Baltimore.' },
  { code: 'MA', name: 'Massachusetts', slogan: 'The Spirit of America', rarity: 'common', notes: 'Red serials on white; Cape Cod stickers common in summer.' },
  { code: 'MI', name: 'Michigan', slogan: 'Water Wonderland', rarity: 'common', notes: 'Great Lakes outline is a strong visual cue.' },
  { code: 'MN', name: 'Minnesota', slogan: 'Land of 10,000 Lakes', rarity: 'uncommon', notes: 'Lake / loon themes; winter migration spots down south.' },
  { code: 'MS', name: 'Mississippi', slogan: 'The Magnolia State', rarity: 'uncommon', notes: 'Magnolia graphic; common on I-55 / I-20.' },
  { code: 'MO', name: 'Missouri', slogan: 'Show-Me State', rarity: 'common', notes: 'Gateway Arch specialty plates are frequent near St. Louis.' },
  { code: 'MT', name: 'Montana', slogan: 'Big Sky Country', rarity: 'rare', notes: 'Blue sky graphic; rare east of the Rockies.' },
  { code: 'NE', name: 'Nebraska', slogan: 'Cornhusker State', rarity: 'uncommon', notes: 'Chimney Rock graphic is a quick tell.' },
  { code: 'NV', name: 'Nevada', slogan: 'Silver State', rarity: 'common', notes: 'Blue mountain range design; Vegas / Reno traffic.' },
  { code: 'NH', name: 'New Hampshire', slogan: 'Live Free or Die', rarity: 'uncommon', notes: 'Motto is printed on every standard plate.' },
  { code: 'NJ', name: 'New Jersey', slogan: 'Garden State', rarity: 'common', notes: 'Yellow / buff plates are dense on the Northeast corridor.' },
  { code: 'NM', name: 'New Mexico', slogan: 'Land of Enchantment', rarity: 'uncommon', notes: 'Zia sun symbol is unique and memorable.' },
  { code: 'NY', name: 'New York', slogan: 'Empire State', rarity: 'common', notes: 'Blue Empire Gold and older white plates both circulate.' },
  { code: 'NC', name: 'North Carolina', slogan: 'First in Flight', rarity: 'common', notes: 'Wright Flyer graphic is the standard tell.' },
  { code: 'ND', name: 'North Dakota', slogan: 'Peace Garden State', rarity: 'rare', notes: 'Low population = scarce out-of-state sightings.' },
  { code: 'OH', name: 'Ohio', slogan: 'Birthplace of Aviation', rarity: 'common', notes: 'Sunrise / cityline designs dominate I-70 / I-71.' },
  { code: 'OK', name: 'Oklahoma', slogan: 'Native America', rarity: 'uncommon', notes: 'Scissor-tail / state outline graphics.' },
  { code: 'OR', name: 'Oregon', slogan: 'Pacific Wonderland', rarity: 'uncommon', notes: 'Trees graphic; common along the West Coast.' },
  { code: 'PA', name: 'Pennsylvania', slogan: 'Keystone State', rarity: 'common', notes: 'Keystone silhouette; dense Mid-Atlantic traffic.' },
  { code: 'RI', name: 'Rhode Island', slogan: 'Ocean State', rarity: 'uncommon', notes: 'Wave graphic; small state, frequent New England travel.' },
  { code: 'SC', name: 'South Carolina', slogan: 'While I Breathe, I Hope', rarity: 'common', notes: 'Palmetto and crescent moon are classic.' },
  { code: 'SD', name: 'South Dakota', slogan: 'Mount Rushmore State', rarity: 'rare', notes: 'Rushmore graphic travels with summer road-trippers.' },
  { code: 'TN', name: 'Tennessee', slogan: 'The Volunteer State', rarity: 'common', notes: 'Tristar emblem is the fingerprint.' },
  { code: 'TX', name: 'Texas', slogan: 'The Lone Star State', rarity: 'common', notes: 'Lone Star and silhouette plates are among the most seen.' },
  { code: 'UT', name: 'Utah', slogan: 'Life Elevated', rarity: 'uncommon', notes: 'Arch / ski graphics; common in Mountain West.' },
  { code: 'VT', name: 'Vermont', slogan: 'Green Mountain State', rarity: 'rare', notes: 'Green mountains; scarce outside New England.' },
  { code: 'VA', name: 'Virginia', slogan: 'Virginia is for Lovers', rarity: 'common', notes: 'Slogan plates and blue serials around DC / I-95.' },
  { code: 'WA', name: 'Washington', slogan: 'Evergreen State', rarity: 'common', notes: 'Mountain graphic; strong Pacific Northwest density.' },
  { code: 'WV', name: 'West Virginia', slogan: 'Wild, Wonderful', rarity: 'uncommon', notes: 'Slogan plates travel with Appalachian routes.' },
  { code: 'WI', name: 'Wisconsin', slogan: 'America\'s Dairyland', rarity: 'uncommon', notes: 'America\'s Dairyland text is a giveaway.' },
  { code: 'WY', name: 'Wyoming', slogan: 'Equality State', rarity: 'rare', notes: 'Bucking horse is iconic and scarce far from home.' },
  { code: 'DC', name: 'Washington, D.C.', slogan: 'Taxation Without Representation', rarity: 'uncommon', notes: 'Motto plates are frequent around the capital region.' },
]

const BY_CODE = new Map(JURISDICTIONS.map((j) => [j.code, j]))

export function getJurisdiction(code: string): Jurisdiction | undefined {
  return BY_CODE.get(code.toUpperCase())
}

export function rarityLabel(rarity: Jurisdiction['rarity']): string {
  switch (rarity) {
    case 'common':
      return 'Common in most regions'
    case 'uncommon':
      return 'Uncommon outside home region'
    case 'rare':
      return 'Rare away from home state'
    case 'very-rare':
      return 'Very rare on the mainland'
  }
}
