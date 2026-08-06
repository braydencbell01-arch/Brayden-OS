/** Illustrative plate designs per US jurisdiction (not official facsimiles). */

export type PlateColors = {
  bg: string
  fg: string
  bar?: string
  accent?: string
}

export type PlateDesign = {
  id: string
  name: string
  kind: 'standard' | 'classic' | 'specialty' | 'optional'
  slogan?: string
  colors: PlateColors
  sample: string
}

type Extra = {
  name: string
  kind: PlateDesign['kind']
  slogan?: string
  colors: PlateColors
  sample?: string
}

type Entry = {
  code: string
  name: string
  slogan?: string
  colors: PlateColors
  sample?: string
  extras: Extra[]
}

const S = 'ABC·1234'

const ENTRIES: Entry[] = [
  { code: 'AL', name: 'Sweet Home Alabama', slogan: 'Sweet Home Alabama', colors: { bg: '#f4f0e6', fg: '#1a3a6b', bar: '#9b1b1b' }, extras: [{ name: 'Heart of Dixie', kind: 'classic', colors: { bg: '#1a3a6b', fg: '#f4f0e6' } }, { name: 'God Bless America', kind: 'specialty', colors: { bg: '#f4f0e6', fg: '#9b1b1b', accent: '#1a3a6b' } }] },
  { code: 'AK', name: 'The Last Frontier', slogan: 'The Last Frontier', colors: { bg: '#1e3a5f', fg: '#d4a84b' }, extras: [{ name: 'Gold rush classic', kind: 'classic', colors: { bg: '#0f2744', fg: '#e8c15a' } }, { name: 'Wildlife', kind: 'specialty', colors: { bg: '#243d2e', fg: '#f0e6c8' } }] },
  { code: 'AZ', name: 'Grand Canyon State', slogan: 'Grand Canyon State', colors: { bg: '#f7f1e3', fg: '#b91c1c', bar: '#7c2d12' }, extras: [{ name: 'Cactus graphic', kind: 'specialty', colors: { bg: '#f7f1e3', fg: '#9a3412', accent: '#166534' } }, { name: 'Desert sunset', kind: 'optional', colors: { bg: '#7c2d12', fg: '#fde68a' } }] },
  { code: 'AR', name: 'The Natural State', slogan: 'The Natural State', colors: { bg: '#ffffff', fg: '#1d4ed8', bar: '#b91c1c' }, extras: [{ name: 'Diamond motif', kind: 'specialty', colors: { bg: '#eff6ff', fg: '#1e3a8a' } }, { name: 'In God We Trust', kind: 'optional', colors: { bg: '#ffffff', fg: '#111827' } }] },
  { code: 'CA', name: 'Blue on white', slogan: 'California', colors: { bg: '#ffffff', fg: '#1e3a8a', bar: '#dc2626' }, extras: [{ name: 'Black & yellow classic', kind: 'classic', colors: { bg: '#111827', fg: '#facc15' } }, { name: 'Yosemite', kind: 'specialty', colors: { bg: '#ecfdf5', fg: '#14532d' } }, { name: 'Legacy script', kind: 'optional', colors: { bg: '#fefce8', fg: '#1e3a8a' } }] },
  { code: 'CO', name: 'Colorful Colorado', slogan: 'Colorful Colorado', colors: { bg: '#ffffff', fg: '#166534' }, extras: [{ name: 'Green mountains', kind: 'specialty', colors: { bg: '#ecfdf5', fg: '#14532d', accent: '#0ea5e9' } }, { name: 'Ski country', kind: 'optional', colors: { bg: '#e0f2fe', fg: '#0c4a6e' } }] },
  { code: 'CT', name: 'Constitution State', slogan: 'Constitution State', colors: { bg: '#ffffff', fg: '#1e3a8a' }, extras: [{ name: 'Preserve the Sound', kind: 'specialty', colors: { bg: '#e0f2fe', fg: '#075985' } }, { name: 'Classic blue', kind: 'classic', colors: { bg: '#1e3a8a', fg: '#ffffff' } }] },
  { code: 'DE', name: 'The First State', slogan: 'The First State', colors: { bg: '#111827', fg: '#fbbf24' }, extras: [{ name: 'Gold & black classic', kind: 'classic', colors: { bg: '#fbbf24', fg: '#111827' } }, { name: 'Farmland', kind: 'specialty', colors: { bg: '#fef3c7', fg: '#422006' } }] },
  { code: 'FL', name: 'Sunshine State', slogan: 'Sunshine State', colors: { bg: '#ffffff', fg: '#1e3a8a', accent: '#ea580c' }, extras: [{ name: 'Orange blossom', kind: 'specialty', colors: { bg: '#fff7ed', fg: '#9a3412' } }, { name: 'Save the Manatee', kind: 'optional', colors: { bg: '#ecfeff', fg: '#155e75' } }, { name: 'MyFlorida era', kind: 'classic', colors: { bg: '#ffffff', fg: '#1d4ed8' } }] },
  { code: 'GA', name: 'Peach State', slogan: 'Georgia', colors: { bg: '#ffffff', fg: '#1e3a8a', accent: '#ea580c' }, extras: [{ name: 'Peach graphic', kind: 'specialty', colors: { bg: '#fff7ed', fg: '#9a3412' } }, { name: 'In God We Trust', kind: 'optional', colors: { bg: '#ffffff', fg: '#111827' } }] },
  { code: 'HI', name: 'Aloha State', slogan: 'Aloha State', colors: { bg: '#ffffff', fg: '#0f766e' }, extras: [{ name: 'Rainbow', kind: 'specialty', colors: { bg: '#ecfeff', fg: '#134e4a', accent: '#db2777' } }, { name: 'Volcano', kind: 'optional', colors: { bg: '#1c1917', fg: '#fb923c' } }] },
  { code: 'ID', name: 'Famous Potatoes', slogan: 'Famous Potatoes', colors: { bg: '#ffffff', fg: '#1e3a8a', bar: '#b91c1c' }, extras: [{ name: 'Potato slogan classic', kind: 'classic', colors: { bg: '#fefce8', fg: '#1e3a8a' } }, { name: 'Scenic Idaho', kind: 'specialty', colors: { bg: '#ecfdf5', fg: '#14532d' } }] },
  { code: 'IL', name: 'Land of Lincoln', slogan: 'Land of Lincoln', colors: { bg: '#ffffff', fg: '#1e3a8a' }, extras: [{ name: 'Lincoln silhouette', kind: 'specialty', colors: { bg: '#eff6ff', fg: '#1e3a8a' } }, { name: 'White & blue classic', kind: 'classic', colors: { bg: '#1e3a8a', fg: '#ffffff' } }] },
  { code: 'IN', name: 'Hoosier State', slogan: 'Indiana', colors: { bg: '#ffffff', fg: '#1e3a8a', bar: '#b91c1c' }, extras: [{ name: 'In God We Trust', kind: 'optional', colors: { bg: '#ffffff', fg: '#111827' } }, { name: 'Amateur radio', kind: 'specialty', colors: { bg: '#fef2f2', fg: '#7f1d1d' } }] },
  { code: 'IA', name: 'Hawkeye State', slogan: 'Iowa', colors: { bg: '#ffffff', fg: '#1e3a8a' }, extras: [{ name: 'County sticker style', kind: 'classic', colors: { bg: '#f8fafc', fg: '#1e3a8a', bar: '#64748b' } }, { name: 'Natural resources', kind: 'specialty', colors: { bg: '#ecfdf5', fg: '#166534' } }] },
  { code: 'KS', name: 'Sunflower State', slogan: 'Kansas', colors: { bg: '#ffffff', fg: '#1e3a8a', accent: '#ca8a04' }, extras: [{ name: 'Sunflower graphic', kind: 'specialty', colors: { bg: '#fefce8', fg: '#713f12' } }, { name: 'Ad astra', kind: 'optional', colors: { bg: '#0f172a', fg: '#facc15' } }] },
  { code: 'KY', name: 'Bluegrass State', slogan: 'Bluegrass State', colors: { bg: '#ffffff', fg: '#1e3a8a' }, extras: [{ name: 'Bluegrass branding', kind: 'specialty', colors: { bg: '#eff6ff', fg: '#1d4ed8' } }, { name: 'In God We Trust', kind: 'optional', colors: { bg: '#ffffff', fg: '#111827' } }] },
  { code: 'LA', name: "Sportsman's Paradise", slogan: "Sportsman's Paradise", colors: { bg: '#ffffff', fg: '#1e3a8a', accent: '#b45309' }, extras: [{ name: 'Pelican', kind: 'specialty', colors: { bg: '#fffbeb', fg: '#1e3a8a' } }, { name: 'Bayou classic', kind: 'classic', colors: { bg: '#1e3a8a', fg: '#fde68a' } }] },
  { code: 'ME', name: 'Vacationland', slogan: 'Vacationland', colors: { bg: '#ffffff', fg: '#1e3a8a', accent: '#b91c1c' }, extras: [{ name: 'Chickadee', kind: 'specialty', colors: { bg: '#f0fdf4', fg: '#14532d' } }, { name: 'Lobster', kind: 'optional', colors: { bg: '#fff1f2', fg: '#9f1239' } }] },
  { code: 'MD', name: 'Old Line State', slogan: 'Maryland', colors: { bg: '#ffffff', fg: '#1e3a8a', accent: '#b91c1c' }, extras: [{ name: 'Shield / crab', kind: 'specialty', colors: { bg: '#fef2f2', fg: '#1e3a8a' } }, { name: 'Treasure the Chesapeake', kind: 'optional', colors: { bg: '#ecfeff', fg: '#155e75' } }] },
  { code: 'MA', name: 'Spirit of America', slogan: 'The Spirit of America', colors: { bg: '#ffffff', fg: '#b91c1c' }, extras: [{ name: 'Cape Cod', kind: 'specialty', colors: { bg: '#e0f2fe', fg: '#0c4a6e' } }, { name: 'Minuteman classic', kind: 'classic', colors: { bg: '#fef2f2', fg: '#7f1d1d' } }] },
  { code: 'MI', name: 'Water Wonderland', slogan: 'Great Lakes', colors: { bg: '#ffffff', fg: '#1e3a8a' }, extras: [{ name: 'Great Lakes outline', kind: 'specialty', colors: { bg: '#eff6ff', fg: '#1e40af' } }, { name: 'Pure Michigan', kind: 'optional', colors: { bg: '#ecfeff', fg: '#0e7490' } }] },
  { code: 'MN', name: '10,000 Lakes', slogan: 'Land of 10,000 Lakes', colors: { bg: '#ffffff', fg: '#1e3a8a' }, extras: [{ name: 'Loon', kind: 'specialty', colors: { bg: '#f0f9ff', fg: '#0c4a6e' } }, { name: 'Critical habitat', kind: 'optional', colors: { bg: '#ecfdf5', fg: '#166534' } }] },
  { code: 'MS', name: 'Magnolia State', slogan: 'The Magnolia State', colors: { bg: '#ffffff', fg: '#1e3a8a' }, extras: [{ name: 'Magnolia graphic', kind: 'specialty', colors: { bg: '#fdf2f8', fg: '#9d174d' } }, { name: 'In God We Trust', kind: 'optional', colors: { bg: '#ffffff', fg: '#111827' } }] },
  { code: 'MO', name: 'Show-Me State', slogan: 'Show-Me State', colors: { bg: '#ffffff', fg: '#1e3a8a' }, extras: [{ name: 'Gateway Arch', kind: 'specialty', colors: { bg: '#f8fafc', fg: '#334155' } }, { name: 'God Bless America', kind: 'optional', colors: { bg: '#eff6ff', fg: '#1e3a8a' } }] },
  { code: 'MT', name: 'Big Sky Country', slogan: 'Big Sky Country', colors: { bg: '#e0f2fe', fg: '#1e3a8a' }, extras: [{ name: 'Blue sky graphic', kind: 'specialty', colors: { bg: '#bae6fd', fg: '#0c4a6e' } }, { name: 'Classic white', kind: 'classic', colors: { bg: '#ffffff', fg: '#1e3a8a' } }] },
  { code: 'NE', name: 'Cornhusker State', slogan: 'Cornhusker State', colors: { bg: '#ffffff', fg: '#1e3a8a' }, extras: [{ name: 'Chimney Rock', kind: 'specialty', colors: { bg: '#fff7ed', fg: '#9a3412' } }, { name: 'Tree planting', kind: 'optional', colors: { bg: '#ecfdf5', fg: '#166534' } }] },
  { code: 'NV', name: 'Silver State', slogan: 'Silver State', colors: { bg: '#e0f2fe', fg: '#1e3a8a' }, extras: [{ name: 'Blue mountains', kind: 'specialty', colors: { bg: '#dbeafe', fg: '#1e3a8a' } }, { name: 'Battle Born', kind: 'optional', colors: { bg: '#0f172a', fg: '#e2e8f0' } }] },
  { code: 'NH', name: 'Live Free or Die', slogan: 'Live Free or Die', colors: { bg: '#ffffff', fg: '#1e3a8a', bar: '#166534' }, extras: [{ name: 'Old Man of the Mountain', kind: 'specialty', colors: { bg: '#f0fdf4', fg: '#14532d' } }, { name: 'Moose', kind: 'optional', colors: { bg: '#ecfdf5', fg: '#166534' } }] },
  { code: 'NJ', name: 'Garden State', slogan: 'Garden State', colors: { bg: '#fde68a', fg: '#1e3a8a' }, extras: [{ name: 'Buff classic', kind: 'classic', colors: { bg: '#fef3c7', fg: '#1e3a8a' } }, { name: 'Shore', kind: 'specialty', colors: { bg: '#e0f2fe', fg: '#075985' } }] },
  { code: 'NM', name: 'Land of Enchantment', slogan: 'Land of Enchantment', colors: { bg: '#fef3c7', fg: '#b91c1c', accent: '#ca8a04' }, extras: [{ name: 'Zia sun', kind: 'specialty', colors: { bg: '#fffbeb', fg: '#b45309' } }, { name: 'Turquoise trail', kind: 'optional', colors: { bg: '#ecfeff', fg: '#0f766e' } }] },
  { code: 'NY', name: 'Empire Gold', slogan: 'Empire State', colors: { bg: '#1e3a8a', fg: '#fbbf24' }, extras: [{ name: 'White classic', kind: 'classic', colors: { bg: '#ffffff', fg: '#1e3a8a', bar: '#b91c1c' } }, { name: 'Statue of Liberty', kind: 'specialty', colors: { bg: '#eff6ff', fg: '#1e3a8a' } }, { name: 'I Love NY', kind: 'optional', colors: { bg: '#ffffff', fg: '#b91c1c' } }] },
  { code: 'NC', name: 'First in Flight', slogan: 'First in Flight', colors: { bg: '#ffffff', fg: '#b91c1c' }, extras: [{ name: 'Wright Flyer', kind: 'specialty', colors: { bg: '#fff1f2', fg: '#9f1239' } }, { name: 'First in Freedom', kind: 'optional', colors: { bg: '#eff6ff', fg: '#1e3a8a' } }] },
  { code: 'ND', name: 'Peace Garden State', slogan: 'Peace Garden State', colors: { bg: '#ffffff', fg: '#1e3a8a' }, extras: [{ name: 'Peace Garden graphic', kind: 'specialty', colors: { bg: '#f0fdf4', fg: '#166534' } }, { name: 'Classic blue serial', kind: 'classic', colors: { bg: '#f8fafc', fg: '#1e3a8a' } }] },
  { code: 'OH', name: 'Birthplace of Aviation', slogan: 'Birthplace of Aviation', colors: { bg: '#ffffff', fg: '#1e3a8a', accent: '#ea580c' }, extras: [{ name: 'Sunrise cityline', kind: 'specialty', colors: { bg: '#fff7ed', fg: '#9a3412' } }, { name: 'Bicentennial classic', kind: 'classic', colors: { bg: '#eff6ff', fg: '#1e3a8a' } }] },
  { code: 'OK', name: 'Native America', slogan: 'Native America', colors: { bg: '#ffffff', fg: '#1e3a8a' }, extras: [{ name: 'Scissor-tail', kind: 'specialty', colors: { bg: '#ecfdf5', fg: '#14532d' } }, { name: 'State outline', kind: 'optional', colors: { bg: '#fff7ed', fg: '#9a3412' } }] },
  { code: 'OR', name: 'Pacific Wonderland', slogan: 'Pacific Wonderland', colors: { bg: '#ffffff', fg: '#1e3a8a', accent: '#166534' }, extras: [{ name: 'Trees graphic', kind: 'specialty', colors: { bg: '#ecfdf5', fg: '#14532d' } }, { name: 'Crater Lake', kind: 'optional', colors: { bg: '#e0f2fe', fg: '#0c4a6e' } }] },
  { code: 'PA', name: 'Keystone State', slogan: 'Pennsylvania', colors: { bg: '#ffffff', fg: '#1e3a8a', bar: '#fbbf24' }, extras: [{ name: 'Keystone silhouette', kind: 'specialty', colors: { bg: '#fffbeb', fg: '#1e3a8a' } }, { name: 'We Are…', kind: 'optional', colors: { bg: '#eff6ff', fg: '#1e3a8a' } }] },
  { code: 'RI', name: 'Ocean State', slogan: 'Ocean State', colors: { bg: '#ffffff', fg: '#1e3a8a', accent: '#0ea5e9' }, extras: [{ name: 'Wave graphic', kind: 'specialty', colors: { bg: '#e0f2fe', fg: '#075985' } }, { name: 'Hope classic', kind: 'classic', colors: { bg: '#1e3a8a', fg: '#ffffff' } }] },
  { code: 'SC', name: 'While I Breathe, I Hope', slogan: 'South Carolina', colors: { bg: '#ffffff', fg: '#1e3a8a', accent: '#b91c1c' }, extras: [{ name: 'Palmetto & crescent', kind: 'specialty', colors: { bg: '#ecfdf5', fg: '#14532d' } }, { name: 'In God We Trust', kind: 'optional', colors: { bg: '#ffffff', fg: '#111827' } }] },
  { code: 'SD', name: 'Mount Rushmore State', slogan: 'Mount Rushmore State', colors: { bg: '#ffffff', fg: '#1e3a8a' }, extras: [{ name: 'Rushmore graphic', kind: 'specialty', colors: { bg: '#f8fafc', fg: '#334155' } }, { name: 'Pheasant', kind: 'optional', colors: { bg: '#fff7ed', fg: '#9a3412' } }] },
  { code: 'TN', name: 'Volunteer State', slogan: 'The Volunteer State', colors: { bg: '#ffffff', fg: '#1e3a8a', accent: '#b91c1c' }, extras: [{ name: 'Tristar', kind: 'specialty', colors: { bg: '#eff6ff', fg: '#1e3a8a' } }, { name: 'In God We Trust', kind: 'optional', colors: { bg: '#ffffff', fg: '#111827' } }] },
  { code: 'TX', name: 'Lone Star', slogan: 'The Lone Star State', colors: { bg: '#ffffff', fg: '#1e3a8a', accent: '#b91c1c' }, extras: [{ name: 'State silhouette', kind: 'specialty', colors: { bg: '#eff6ff', fg: '#1e3a8a' } }, { name: 'God Bless Texas', kind: 'optional', colors: { bg: '#fef2f2', fg: '#7f1d1d' } }, { name: 'Black classic', kind: 'classic', colors: { bg: '#111827', fg: '#ffffff' } }] },
  { code: 'UT', name: 'Life Elevated', slogan: 'Life Elevated', colors: { bg: '#ffffff', fg: '#1e3a8a' }, extras: [{ name: 'Arches', kind: 'specialty', colors: { bg: '#fff7ed', fg: '#9a3412' } }, { name: 'Ski Utah', kind: 'optional', colors: { bg: '#e0f2fe', fg: '#0c4a6e' } }] },
  { code: 'VT', name: 'Green Mountain State', slogan: 'Green Mountain State', colors: { bg: '#ecfdf5', fg: '#14532d' }, extras: [{ name: 'Green mountains', kind: 'specialty', colors: { bg: '#d1fae5', fg: '#064e3b' } }, { name: 'Scenic', kind: 'optional', colors: { bg: '#ffffff', fg: '#166534' } }] },
  { code: 'VA', name: 'Virginia is for Lovers', slogan: 'Virginia is for Lovers', colors: { bg: '#ffffff', fg: '#1e3a8a' }, extras: [{ name: 'Slogan plate', kind: 'specialty', colors: { bg: '#fdf2f8', fg: '#9d174d' } }, { name: 'Blue serial classic', kind: 'classic', colors: { bg: '#ffffff', fg: '#1d4ed8' } }] },
  { code: 'WA', name: 'Evergreen State', slogan: 'Evergreen State', colors: { bg: '#ffffff', fg: '#1e3a8a', accent: '#166534' }, extras: [{ name: 'Mountain graphic', kind: 'specialty', colors: { bg: '#ecfdf5', fg: '#14532d' } }, { name: 'National parks', kind: 'optional', colors: { bg: '#e0f2fe', fg: '#0c4a6e' } }] },
  { code: 'WV', name: 'Wild, Wonderful', slogan: 'Wild, Wonderful', colors: { bg: '#ffffff', fg: '#1e3a8a' }, extras: [{ name: 'Slogan plate', kind: 'specialty', colors: { bg: '#ecfdf5', fg: '#166534' } }, { name: 'Classic white', kind: 'classic', colors: { bg: '#f8fafc', fg: '#1e3a8a' } }] },
  { code: 'WI', name: "America's Dairyland", slogan: "America's Dairyland", colors: { bg: '#ffffff', fg: '#1e3a8a', bar: '#b91c1c' }, extras: [{ name: 'Dairy classic', kind: 'classic', colors: { bg: '#eff6ff', fg: '#1e3a8a' } }, { name: 'Badger', kind: 'specialty', colors: { bg: '#fefce8', fg: '#713f12' } }] },
  { code: 'WY', name: 'Equality State', slogan: 'Wyoming', colors: { bg: '#ffffff', fg: '#b91c1c' }, extras: [{ name: 'Bucking horse', kind: 'specialty', colors: { bg: '#fef2f2', fg: '#7f1d1d' } }, { name: 'Yellow & black classic', kind: 'classic', colors: { bg: '#facc15', fg: '#111827' } }] },
  { code: 'DC', name: 'Taxation Without Representation', slogan: 'Taxation Without Representation', colors: { bg: '#ffffff', fg: '#1e3a8a', bar: '#b91c1c' }, extras: [{ name: 'Motto plate', kind: 'specialty', colors: { bg: '#eff6ff', fg: '#1e3a8a' } }, { name: 'Cherry blossom', kind: 'optional', colors: { bg: '#fdf2f8', fg: '#9d174d' } }] },
]

function build(entry: Entry): PlateDesign[] {
  const standard: PlateDesign = {
    id: `${entry.code}-standard`,
    kind: 'standard',
    name: entry.name,
    slogan: entry.slogan,
    colors: entry.colors,
    sample: entry.sample ?? S,
  }
  const extras = entry.extras.map((e, i) => ({
    id: `${entry.code}-${e.kind}-${i}`,
    name: e.name,
    kind: e.kind,
    slogan: e.slogan,
    colors: e.colors,
    sample: e.sample ?? S,
  }))
  return [standard, ...extras]
}

export const PLATES_BY_CODE: Record<string, PlateDesign[]> = Object.fromEntries(
  ENTRIES.map((e) => [e.code, build(e)]),
)

export function getPlatesForCode(code: string): PlateDesign[] {
  return PLATES_BY_CODE[code.toUpperCase()] ?? []
}

export function getMainPlate(code: string): PlateDesign | undefined {
  return getPlatesForCode(code)[0]
}
