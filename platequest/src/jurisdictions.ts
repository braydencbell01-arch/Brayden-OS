/** PlateQuest jurisdictions seen / findable in the USA, sourced from World License Plates. */

export type Region =
  | 'us-state'
  | 'canada'
  | 'mexico'
  | 'territory'
  | 'native'
  | 'military'
  | 'federal'

export type PlateMount = 'rear' | 'both' | 'varies'

export type Jurisdiction = {
  code: string
  name: string
  region: Region
  slogan?: string
  rarity: 'common' | 'uncommon' | 'rare' | 'very-rare'
  notes: string
  /** Relative path under worldlicenseplates.com (no leading slash), e.g. usa/US_CAXX.html */
  wlpPath: string
  /** Image filename stem used on WLP (e.g. US_CAXX) for filtering jpglps */
  wlpStem: string
  plateMount?: PlateMount
}

/** Front/rear display rules from WLP USA plate-requirements map. */
export const PLATE_MOUNT: Record<string, PlateMount> = {
  // One plate (rear) — blue on WLP map
  AL: 'rear', AZ: 'rear', AR: 'rear', CT: 'rear', DE: 'rear', FL: 'rear', GA: 'rear',
  IN: 'rear', KS: 'rear', KY: 'rear', LA: 'rear', MA: 'rear', MD: 'rear', MI: 'rear',
  MS: 'rear', NJ: 'rear', NM: 'rear', NC: 'rear', OH: 'rear', OK: 'rear', PA: 'rear',
  RI: 'rear', SC: 'rear', TN: 'rear', VA: 'rear', WV: 'rear',
  // Two plates — pink on WLP map
  AK: 'both', CA: 'both', CO: 'both', HI: 'both', ID: 'both', IL: 'both', IA: 'both',
  ME: 'both', MN: 'both', MO: 'both', MT: 'both', NE: 'both', NV: 'both', NH: 'both',
  NY: 'both', ND: 'both', OR: 'both', SD: 'both', TX: 'both', UT: 'both', VT: 'both',
  WA: 'both', WI: 'both', WY: 'both', DC: 'both',
}

export const REGION_LABEL: Record<Region, string> = {
  'us-state': 'United States',
  canada: 'Canada',
  mexico: 'Mexico',
  territory: 'U.S. territories & associated',
  native: 'Native American',
  military: 'U.S. military',
  federal: 'U.S. federal / special',
}

function us(code: string, name: string, rarity: Jurisdiction['rarity'], notes: string, slogan?: string): Jurisdiction {
  return {
    code,
    name,
    region: 'us-state',
    rarity,
    notes,
    slogan,
    wlpPath: `usa/US_${code}XX.html`,
    wlpStem: `US_${code}XX`,
    plateMount: PLATE_MOUNT[code],
  }
}

export const JURISDICTIONS: Jurisdiction[] = [
  // —— US states + DC ——
  us('AL', 'Alabama', 'common', 'Heart of Dixie plates still circulate alongside newer designs.', 'Sweet Home Alabama'),
  us('AK', 'Alaska', 'rare', 'Gold-on-blue classic look; scarce outside the Pacific Northwest.', 'The Last Frontier'),
  us('AZ', 'Arizona', 'common', 'Cactus graphics and red serials are easy roadside tells.', 'Grand Canyon State'),
  us('AR', 'Arkansas', 'uncommon', 'Diamond motif nods to natural resources.', 'The Natural State'),
  us('CA', 'California', 'common', 'Blue-on-white is the most spotted plate in many western states.', 'California'),
  us('CO', 'Colorado', 'common', 'Green mountains graphic is a quick ID.', 'Colorful Colorado'),
  us('CT', 'Connecticut', 'uncommon', 'Often seen along the Northeast corridor.', 'Constitution State'),
  us('DE', 'Delaware', 'uncommon', 'Black-gold classics are collector favorites.', 'The First State'),
  us('FL', 'Florida', 'common', 'Orange blossom and specialty plates are everywhere in the Southeast.', 'Sunshine State'),
  us('GA', 'Georgia', 'common', 'Peach graphic variants are common on I-75 / I-85.', 'Peach State'),
  us('HI', 'Hawaii', 'very-rare', 'Rainbow plates rarely leave the islands.', 'Aloha State'),
  us('ID', 'Idaho', 'uncommon', 'Potato slogan makes ID nearly unmistakable.', 'Famous Potatoes'),
  us('IL', 'Illinois', 'common', 'Blue Lincoln silhouette is a Midwest staple.', 'Land of Lincoln'),
  us('IN', 'Indiana', 'common', 'Often paired with farm / sports specialty plates.', 'Hoosier State'),
  us('IA', 'Iowa', 'uncommon', 'Simple blue serials; county stickers help confirm.', 'Hawkeye State'),
  us('KS', 'Kansas', 'uncommon', 'Sunflower graphic is the giveaway.', 'Sunflower State'),
  us('KY', 'Kentucky', 'common', 'Bluegrass branding dominates passenger plates.', 'Bluegrass State'),
  us('LA', 'Louisiana', 'common', "Pelican graphic; common along the Gulf.", "Sportsman's Paradise"),
  us('ME', 'Maine', 'uncommon', 'Chickadee / lobster themes travel with summer traffic.', 'Vacationland'),
  us('MD', 'Maryland', 'common', 'Shield and crab motifs are frequent near DC / Baltimore.', 'Old Line State'),
  us('MA', 'Massachusetts', 'common', 'Red serials on white; Cape Cod stickers common in summer.', 'The Spirit of America'),
  us('MI', 'Michigan', 'common', 'Great Lakes outline is a strong visual cue.', 'Water Wonderland'),
  us('MN', 'Minnesota', 'uncommon', 'Lake / loon themes; winter migration spots down south.', 'Land of 10,000 Lakes'),
  us('MS', 'Mississippi', 'uncommon', 'Magnolia graphic; common on I-55 / I-20.', 'The Magnolia State'),
  us('MO', 'Missouri', 'common', 'Gateway Arch specialty plates are frequent near St. Louis.', 'Show-Me State'),
  us('MT', 'Montana', 'rare', 'Blue sky graphic; rare east of the Rockies.', 'Big Sky Country'),
  us('NE', 'Nebraska', 'uncommon', 'Chimney Rock graphic is a quick tell.', 'Cornhusker State'),
  us('NV', 'Nevada', 'common', 'Blue mountain range design; Vegas / Reno traffic.', 'Silver State'),
  us('NH', 'New Hampshire', 'uncommon', 'Motto is printed on every standard plate.', 'Live Free or Die'),
  us('NJ', 'New Jersey', 'common', 'Yellow / buff plates are dense on the Northeast corridor.', 'Garden State'),
  us('NM', 'New Mexico', 'uncommon', 'Zia sun symbol is unique and memorable.', 'Land of Enchantment'),
  us('NY', 'New York', 'common', 'Blue Empire Gold and older white plates both circulate.', 'Empire State'),
  us('NC', 'North Carolina', 'common', 'Wright Flyer graphic is the standard tell.', 'First in Flight'),
  us('ND', 'North Dakota', 'rare', 'Low population = scarce out-of-state sightings.', 'Peace Garden State'),
  us('OH', 'Ohio', 'common', 'Sunrise / cityline designs dominate I-70 / I-71.', 'Birthplace of Aviation'),
  us('OK', 'Oklahoma', 'uncommon', 'Scissor-tail / state outline graphics.', 'Native America'),
  us('OR', 'Oregon', 'uncommon', 'Trees graphic; common along the West Coast.', 'Pacific Wonderland'),
  us('PA', 'Pennsylvania', 'common', 'Keystone silhouette; dense Mid-Atlantic traffic.', 'Keystone State'),
  us('RI', 'Rhode Island', 'uncommon', 'Wave graphic; small state, frequent New England travel.', 'Ocean State'),
  us('SC', 'South Carolina', 'common', 'Palmetto and crescent moon are classic.', 'While I Breathe, I Hope'),
  us('SD', 'South Dakota', 'rare', 'Rushmore graphic travels with summer road-trippers.', 'Mount Rushmore State'),
  us('TN', 'Tennessee', 'common', 'Tristar emblem is the fingerprint.', 'The Volunteer State'),
  us('TX', 'Texas', 'common', 'Lone Star and silhouette plates are among the most seen.', 'The Lone Star State'),
  us('UT', 'Utah', 'uncommon', 'Arch / ski graphics; common in Mountain West.', 'Life Elevated'),
  us('VT', 'Vermont', 'rare', 'Green mountains; scarce outside New England.', 'Green Mountain State'),
  us('VA', 'Virginia', 'common', 'Slogan plates and blue serials around DC / I-95.', 'Virginia is for Lovers'),
  us('WA', 'Washington', 'common', 'Mountain graphic; strong Pacific Northwest density.', 'Evergreen State'),
  us('WV', 'West Virginia', 'uncommon', 'Slogan plates travel with Appalachian routes.', 'Wild, Wonderful'),
  us('WI', 'Wisconsin', 'uncommon', "America's Dairyland text is a giveaway.", "America's Dairyland"),
  us('WY', 'Wyoming', 'rare', 'Bucking horse is iconic and scarce far from home.', 'Equality State'),
  us('DC', 'Washington, D.C.', 'uncommon', 'Motto plates are frequent around the capital region.', 'Taxation Without Representation'),

  // —— Canada ——
  { code: 'CA-AB', name: 'Alberta', region: 'canada', rarity: 'uncommon', notes: 'Canadian prairie plates; appear in northern US border states.', wlpPath: 'world/CN_ALBE.html', wlpStem: 'CN_ALBE' },
  { code: 'CA-BC', name: 'British Columbia', region: 'canada', rarity: 'uncommon', notes: 'Common in WA / ID / MT border traffic.', wlpPath: 'world/CN_BCOL.html', wlpStem: 'CN_BCOL' },
  { code: 'CA-MB', name: 'Manitoba', region: 'canada', rarity: 'rare', notes: 'Seen in ND / MN border corridors.', wlpPath: 'world/CN_MANI.html', wlpStem: 'CN_MANI' },
  { code: 'CA-NB', name: 'New Brunswick', region: 'canada', rarity: 'rare', notes: 'Atlantic Canada; occasional New England sightings.', wlpPath: 'world/CN_NEWB.html', wlpStem: 'CN_NEWB' },
  { code: 'CA-NL', name: 'Newfoundland and Labrador', region: 'canada', rarity: 'very-rare', notes: 'Scarce in the continental US.', wlpPath: 'world/CN_NEWF.html', wlpStem: 'CN_NEWF' },
  { code: 'CA-NS', name: 'Nova Scotia', region: 'canada', rarity: 'rare', notes: 'Atlantic plates; summer New England travel.', wlpPath: 'world/CN_NOVA.html', wlpStem: 'CN_NOVA' },
  { code: 'CA-ON', name: 'Ontario', region: 'canada', rarity: 'common', notes: 'One of the most common Canadian plates in the northern US.', wlpPath: 'world/CN_ONTA.html', wlpStem: 'CN_ONTA' },
  { code: 'CA-PE', name: 'Prince Edward Island', region: 'canada', rarity: 'very-rare', notes: 'Small province; rare south of the border.', wlpPath: 'world/CN_PEIX.html', wlpStem: 'CN_PEIX' },
  { code: 'CA-QC', name: 'Québec', region: 'canada', rarity: 'uncommon', notes: 'Blue / white designs; frequent in New England and NY.', wlpPath: 'world/CN_QUEB.html', wlpStem: 'CN_QUEB' },
  { code: 'CA-SK', name: 'Saskatchewan', region: 'canada', rarity: 'rare', notes: 'Prairie plates; MT / ND border.', wlpPath: 'world/CN_SASK.html', wlpStem: 'CN_SASK' },
  { code: 'CA-NT', name: 'Northwest Territories', region: 'canada', rarity: 'very-rare', notes: 'Polar bear outline plates are distinctive and scarce.', wlpPath: 'world/CN_NWTX.html', wlpStem: 'CN_NWTX' },
  { code: 'CA-NU', name: 'Nunavut', region: 'canada', rarity: 'very-rare', notes: 'Rare outside northern Canada.', wlpPath: 'world/CN_NUNA.html', wlpStem: 'CN_NUNA' },
  { code: 'CA-YT', name: 'Yukon', region: 'canada', rarity: 'very-rare', notes: 'Occasional Alaska / Pacific Northwest sightings.', wlpPath: 'world/CN_YUKO.html', wlpStem: 'CN_YUKO' },

  // —— Mexico ——
  { code: 'MX-AGS', name: 'Aguascalientes', region: 'mexico', rarity: 'rare', notes: 'Mexican state plates appear in southern border states.', wlpPath: 'world/MX_AGSX.html', wlpStem: 'MX_AGSX' },
  { code: 'MX-BC', name: 'Baja California', region: 'mexico', rarity: 'common', notes: 'Very common in Southern California and Arizona.', wlpPath: 'world/MX_BAJA.html', wlpStem: 'MX_BAJA' },
  { code: 'MX-BCS', name: 'Baja California Sur', region: 'mexico', rarity: 'uncommon', notes: 'Seen with CA / AZ snowbird and border traffic.', wlpPath: 'world/MX_BCSX.html', wlpStem: 'MX_BCSX' },
  { code: 'MX-CAM', name: 'Campeche', region: 'mexico', rarity: 'rare', notes: 'Gulf / Yucatán region; uncommon in the US.', wlpPath: 'world/MX_CAMP.html', wlpStem: 'MX_CAMP' },
  { code: 'MX-CHIS', name: 'Chiapas', region: 'mexico', rarity: 'rare', notes: 'Southern Mexico; scarce north of the border.', wlpPath: 'world/MX_CHIA.html', wlpStem: 'MX_CHIA' },
  { code: 'MX-CHIH', name: 'Chihuahua', region: 'mexico', rarity: 'common', notes: 'Frequent in Texas / New Mexico border areas.', wlpPath: 'world/MX_CHIH.html', wlpStem: 'MX_CHIH' },
  { code: 'MX-COAH', name: 'Coahuila', region: 'mexico', rarity: 'uncommon', notes: 'Texas border corridor.', wlpPath: 'world/MX_COAH.html', wlpStem: 'MX_COAH' },
  { code: 'MX-COL', name: 'Colima', region: 'mexico', rarity: 'rare', notes: 'Pacific Mexico; uncommon in the US.', wlpPath: 'world/MX_COLI.html', wlpStem: 'MX_COLI' },
  { code: 'MX-CDMX', name: 'Mexico City (CDMX)', region: 'mexico', rarity: 'uncommon', notes: 'Distrito Federal / CDMX plates travel widely.', wlpPath: 'world/MX_DFXX.html', wlpStem: 'MX_DFXX' },
  { code: 'MX-DGO', name: 'Durango', region: 'mexico', rarity: 'rare', notes: 'Northern interior Mexico.', wlpPath: 'world/MX_DURA.html', wlpStem: 'MX_DURA' },
  { code: 'MX-GTO', name: 'Guanajuato', region: 'mexico', rarity: 'uncommon', notes: 'Central Mexico; migrant / family travel to the US.', wlpPath: 'world/MX_GUAN.html', wlpStem: 'MX_GUAN' },
  { code: 'MX-GRO', name: 'Guerrero', region: 'mexico', rarity: 'uncommon', notes: 'Pacific coast; appears in southwestern US.', wlpPath: 'world/MX_GUER.html', wlpStem: 'MX_GUER' },
  { code: 'MX-HGO', name: 'Hidalgo', region: 'mexico', rarity: 'rare', notes: 'Central Mexico.', wlpPath: 'world/MX_HIDA.html', wlpStem: 'MX_HIDA' },
  { code: 'MX-JAL', name: 'Jalisco', region: 'mexico', rarity: 'common', notes: 'One of the most spotted Mexican plates in the US.', wlpPath: 'world/MX_JALI.html', wlpStem: 'MX_JALI' },
  { code: 'MX-MEX', name: 'Estado de México', region: 'mexico', rarity: 'uncommon', notes: 'State of Mexico surrounding CDMX.', wlpPath: 'world/MX_MEXI.html', wlpStem: 'MX_MEXI' },
  { code: 'MX-MICH', name: 'Michoacán', region: 'mexico', rarity: 'uncommon', notes: 'Common in some US Southwest / Midwest corridors.', wlpPath: 'world/MX_MICH.html', wlpStem: 'MX_MICH' },
  { code: 'MX-MOR', name: 'Morelos', region: 'mexico', rarity: 'rare', notes: 'Central Mexico.', wlpPath: 'world/MX_MORE.html', wlpStem: 'MX_MORE' },
  { code: 'MX-NAY', name: 'Nayarit', region: 'mexico', rarity: 'rare', notes: 'Pacific coast.', wlpPath: 'world/MX_NAYA.html', wlpStem: 'MX_NAYA' },
  { code: 'MX-NL', name: 'Nuevo León', region: 'mexico', rarity: 'common', notes: 'Monterrey region; frequent in Texas.', wlpPath: 'world/MX_NLEO.html', wlpStem: 'MX_NLEO' },
  { code: 'MX-OAX', name: 'Oaxaca', region: 'mexico', rarity: 'uncommon', notes: 'Southern Mexico; appears in California and Texas.', wlpPath: 'world/MX_OAXA.html', wlpStem: 'MX_OAXA' },
  { code: 'MX-PUE', name: 'Puebla', region: 'mexico', rarity: 'uncommon', notes: 'Central Mexico travel plates.', wlpPath: 'world/MX_PUEB.html', wlpStem: 'MX_PUEB' },
  { code: 'MX-QRO', name: 'Querétaro', region: 'mexico', rarity: 'rare', notes: 'Central Mexico.', wlpPath: 'world/MX_QUER.html', wlpStem: 'MX_QUER' },
  { code: 'MX-ROO', name: 'Quintana Roo', region: 'mexico', rarity: 'rare', notes: 'Cancún / Riviera Maya region.', wlpPath: 'world/MX_QUIN.html', wlpStem: 'MX_QUIN' },
  { code: 'MX-SLP', name: 'San Luis Potosí', region: 'mexico', rarity: 'uncommon', notes: 'Central / north-central Mexico.', wlpPath: 'world/MX_SLPX.html', wlpStem: 'MX_SLPX' },
  { code: 'MX-SIN', name: 'Sinaloa', region: 'mexico', rarity: 'uncommon', notes: 'Pacific northwest Mexico; AZ / CA traffic.', wlpPath: 'world/MX_SINA.html', wlpStem: 'MX_SINA' },
  { code: 'MX-SON', name: 'Sonora', region: 'mexico', rarity: 'common', notes: 'Very common in Arizona border areas.', wlpPath: 'world/MX_SONO.html', wlpStem: 'MX_SONO' },
  { code: 'MX-TAB', name: 'Tabasco', region: 'mexico', rarity: 'rare', notes: 'Gulf south.', wlpPath: 'world/MX_TABA.html', wlpStem: 'MX_TABA' },
  { code: 'MX-TAM', name: 'Tamaulipas', region: 'mexico', rarity: 'common', notes: 'Texas border; frequent sightings.', wlpPath: 'world/MX_TMPS.html', wlpStem: 'MX_TMPS' },
  { code: 'MX-TLAX', name: 'Tlaxcala', region: 'mexico', rarity: 'rare', notes: 'Small central state.', wlpPath: 'world/MX_TLAX.html', wlpStem: 'MX_TLAX' },
  { code: 'MX-VER', name: 'Veracruz', region: 'mexico', rarity: 'uncommon', notes: 'Gulf coast Mexico.', wlpPath: 'world/MX_VERA.html', wlpStem: 'MX_VERA' },
  { code: 'MX-YUC', name: 'Yucatán', region: 'mexico', rarity: 'rare', notes: 'Yucatán peninsula.', wlpPath: 'world/MX_YUCA.html', wlpStem: 'MX_YUCA' },
  { code: 'MX-ZAC', name: 'Zacatecas', region: 'mexico', rarity: 'uncommon', notes: 'North-central Mexico; diaspora travel to the US.', wlpPath: 'world/MX_ZACA.html', wlpStem: 'MX_ZACA' },

  // —— Territories & associated ——
  { code: 'AS', name: 'American Samoa', region: 'territory', rarity: 'very-rare', notes: 'Pacific territory plates; rarely seen on the mainland.', wlpPath: 'world/PA_AMSA.html', wlpStem: 'PA_AMSA' },
  { code: 'GU', name: 'Guam', region: 'territory', rarity: 'very-rare', notes: 'Pacific territory; occasional mainland sightings near military communities.', wlpPath: 'world/PA_GUAM.html', wlpStem: 'PA_GUAM' },
  { code: 'MP', name: 'Northern Mariana Islands', region: 'territory', rarity: 'very-rare', notes: 'CNMI plates are scarce in the continental US.', wlpPath: 'world/PA_NMAR.html', wlpStem: 'PA_NMAR' },
  { code: 'PR', name: 'Puerto Rico', region: 'territory', rarity: 'uncommon', notes: 'Common in Florida and Northeast metro areas.', wlpPath: 'world/CA_PRIC.html', wlpStem: 'CA_PRIC' },
  { code: 'VI', name: 'U.S. Virgin Islands', region: 'territory', rarity: 'rare', notes: 'Caribbean territory plates; Florida / East Coast.', wlpPath: 'world/CA_USVI.html', wlpStem: 'CA_USVI' },
  { code: 'UM-JON', name: 'Johnston Atoll', region: 'territory', rarity: 'very-rare', notes: 'Historic associated jurisdiction plates.', wlpPath: 'world/PA_JOHN.html', wlpStem: 'PA_JOHN' },
  { code: 'UM-MID', name: 'Midway Island', region: 'territory', rarity: 'very-rare', notes: 'Historic Pacific associated plates.', wlpPath: 'world/PA_MIDW.html', wlpStem: 'PA_MIDW' },
  { code: 'UM-WAK', name: 'Wake Island', region: 'territory', rarity: 'very-rare', notes: 'Historic Pacific associated plates.', wlpPath: 'world/PA_WAKE.html', wlpStem: 'PA_WAKE' },
  { code: 'PCZ', name: 'Panama Canal Zone', region: 'territory', rarity: 'very-rare', notes: 'Historic US-associated jurisdiction (former).', wlpPath: 'world/CE_PCZX.html', wlpStem: 'CE_PCZX' },

  // —— Military ——
  { code: 'US-AF', name: 'U.S. Air Force', region: 'military', rarity: 'uncommon', notes: 'Base / force plates documented by World License Plates.', wlpPath: 'usa/US_XMIL.html', wlpStem: 'US_XAFX' },
  { code: 'US-ARMY', name: 'U.S. Army', region: 'military', rarity: 'uncommon', notes: 'Army plates appear near major installations.', wlpPath: 'usa/US_XMIL.html', wlpStem: 'US_XARM' },
  { code: 'US-CG', name: 'U.S. Coast Guard', region: 'military', rarity: 'rare', notes: 'Coast Guard related plates.', wlpPath: 'usa/US_XMIL.html', wlpStem: 'US_XCGX' },
  { code: 'US-USMC', name: 'U.S. Marine Corps', region: 'military', rarity: 'uncommon', notes: 'Marine Corps plates near USMC bases.', wlpPath: 'usa/US_XMIL.html', wlpStem: 'US_XMAR' },
  { code: 'US-NG', name: 'U.S. National Guard', region: 'military', rarity: 'uncommon', notes: 'National Guard plates.', wlpPath: 'usa/US_XMIL.html', wlpStem: 'US_XNGX' },
  { code: 'US-NAVY', name: 'U.S. Navy', region: 'military', rarity: 'uncommon', notes: 'Navy plates near fleet / shipyard communities.', wlpPath: 'usa/US_XMIL.html', wlpStem: 'US_XNAV' },
  { code: 'US-BASE', name: 'U.S. Military Bases', region: 'military', rarity: 'uncommon', notes: 'Base-issued plates across branches.', wlpPath: 'usa/US_XMIL.html', wlpStem: 'US_XBAS' },
  { code: 'US-MILOTH', name: 'Other military', region: 'military', rarity: 'rare', notes: 'Additional military plate styles.', wlpPath: 'usa/US_XMIL.html', wlpStem: 'US_XOTH' },

  // —— Native American (from WLP AI index) ——
  { code: 'NA-VTAB', name: "Abenaki Nation of Missisquoi", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_VTAB.html", wlpStem: "AI_VTAB" },
  { code: 'NA-OKAS', name: "Absentee Shawnee Tribe", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKAS.html", wlpStem: "AI_OKAS" },
  { code: 'NA-OKAP', name: "Apache Tribe", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKAP.html", wlpStem: "AI_OKAP" },
  { code: 'NA-MIBM', name: "Bay Mills Ojibwe Community", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_MIBM.html", wlpStem: "AI_MIBM" },
  { code: 'NA-MNBF', name: "Bois Forte Band of Minnesota Chippewa", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_MNBF.html", wlpStem: "AI_MNBF" },
  { code: 'NA-OKCN', name: "Caddo Nation", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKCN.html", wlpStem: "AI_OKCN" },
  { code: 'NA-OKCH', name: "Cherokee Nation", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKCH.html", wlpStem: "AI_OKCH" },
  { code: 'NA-OKCA', name: "Cheyenne-Arapaho Tribes", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKCA.html", wlpStem: "AI_OKCA" },
  { code: 'NA-OKCK', name: "Chickasaw Nation", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKCK.html", wlpStem: "AI_OKCK" },
  { code: 'NA-OKCW', name: "Choctaw Nation", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKCW.html", wlpStem: "AI_OKCW" },
  { code: 'NA-OKCP', name: "Citizen Potawatomi Nation", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKCP.html", wlpStem: "AI_OKCP" },
  { code: 'NA-OKCO', name: "Comanche Nation", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKCO.html", wlpStem: "AI_OKCO" },
  { code: 'NA-OKDN', name: "Delaware Nation", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKDN.html", wlpStem: "AI_OKDN" },
  { code: 'NA-NCEB', name: "Eastern Band of Cherokee Indians", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_NCEB.html", wlpStem: "AI_NCEB" },
  { code: 'NA-OKES', name: "Eastern Shawnee Tribe", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKES.html", wlpStem: "AI_OKES" },
  { code: 'NA-MNFL', name: "Fond du Lac Band of Lake Superior Chippewa", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_MNFL.html", wlpStem: "AI_MNFL" },
  { code: 'NA-MNGP', name: "Grand Portage Band of Lake Superior Chippewa", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_MNGP.html", wlpStem: "AI_MNGP" },
  { code: 'NA-NEIO', name: "Iowa Tribe", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_NEIO.html", wlpStem: "AI_NEIO" },
  { code: 'NA-OKIO', name: "Iowa Tribe", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKIO.html", wlpStem: "AI_OKIO" },
  { code: 'NA-OKKA', name: "Kaw Nation", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKKA.html", wlpStem: "AI_OKKA" },
  { code: 'NA-OKKE', name: "Keetoowah Band of Cherokee Indians", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKKE.html", wlpStem: "AI_OKKE" },
  { code: 'NA-MIKB', name: "Keweenaw Bay Ojibwa Tribe", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_MIKB.html", wlpStem: "AI_MIKB" },
  { code: 'NA-OKKI', name: "Kickapoo Tribe", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKKI.html", wlpStem: "AI_OKKI" },
  { code: 'NA-OKKT', name: "Kiowa Tribe", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKKT.html", wlpStem: "AI_OKKT" },
  { code: 'NA-WILF', name: "Lac du Flambeau Ojibwe Nation", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_WILF.html", wlpStem: "AI_WILF" },
  { code: 'NA-MNLL', name: "Leech Lake Band of Ojibwe", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_MNLL.html", wlpStem: "AI_MNLL" },
  { code: 'NA-NDMH', name: "Mandan, Hidatsa and Arikara Nations", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_NDMH.html", wlpStem: "AI_NDMH" },
  { code: 'NA-WIME', name: "Menominee Nation", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_WIME.html", wlpStem: "AI_WIME" },
  { code: 'NA-OKMI', name: "Miami Nation", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKMI.html", wlpStem: "AI_OKMI" },
  { code: 'NA-FLMI', name: "Miccosukee Indians", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_FLMI.html", wlpStem: "AI_FLMI" },
  { code: 'NA-MNML', name: "Mille Lacs Band of Ojibwe", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_MNML.html", wlpStem: "AI_MNML" },
  { code: 'NA-OKMO', name: "Modoc Tribe", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKMO.html", wlpStem: "AI_OKMO" },
  { code: 'NA-OKMC', name: "Muscogee Nation", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKMC.html", wlpStem: "AI_OKMC" },
  { code: 'NA-DENA', name: "Nanticoke Indian Association", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_DENA.html", wlpStem: "AI_DENA" },
  { code: 'NA-CONA', name: "Native Americans in Colorado", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_CONA.html", wlpStem: "AI_CONA" },
  { code: 'NA-KSNA', name: "Native Americans in Kansas", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_KSNA.html", wlpStem: "AI_KSNA" },
  { code: 'NA-MENA', name: "Native Americans in Maine", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_MENA.html", wlpStem: "AI_MENA" },
  { code: 'NA-MDTR', name: "Native Americans in Maryland", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_MDTR.html", wlpStem: "AI_MDTR" },
  { code: 'NA-NMNA', name: "Native Americans in New Mexico", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_NMNA.html", wlpStem: "AI_NMNA" },
  { code: 'NA-SDNA', name: "Native Americans in South Dakota", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_SDNA.html", wlpStem: "AI_SDNA" },
  { code: 'NA-WANA', name: "Native Americans in Washington", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_WANA.html", wlpStem: "AI_WANA" },
  { code: 'NA-WINA', name: "Native Americans in Wisconsin", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_WINA.html", wlpStem: "AI_WINA" },
  { code: 'NA-WION', name: "Oneida Nation", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_WION.html", wlpStem: "AI_WION" },
  { code: 'NA-OKOS', name: "Osage Nation", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKOS.html", wlpStem: "AI_OKOS" },
  { code: 'NA-OKOM', name: "Otoe Missouria Tribe", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKOM.html", wlpStem: "AI_OKOM" },
  { code: 'NA-OKOT', name: "Ottawa Tribe", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKOT.html", wlpStem: "AI_OKOT" },
  { code: 'NA-OKPA', name: "Pawnee Nation", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKPA.html", wlpStem: "AI_OKPA" },
  { code: 'NA-OKPE', name: "Peoria Nation", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKPE.html", wlpStem: "AI_OKPE" },
  { code: 'NA-OKPN', name: "Ponca Nation", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKPN.html", wlpStem: "AI_OKPN" },
  { code: 'NA-OKQU', name: "Quapaw Tribe", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKQU.html", wlpStem: "AI_OKQU" },
  { code: 'NA-WIRC', name: "Red Cliff Band of Lake Superior Chippewa", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_WIRC.html", wlpStem: "AI_WIRC" },
  { code: 'NA-MNRL', name: "Red Lake Band of Chippewa", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_MNRL.html", wlpStem: "AI_MNRL" },
  { code: 'NA-OKSF', name: "Sac and Fox Nation", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKSF.html", wlpStem: "AI_OKSF" },
  { code: 'NA-MISC', name: "Saginaw Chippewa Tribe", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_MISC.html", wlpStem: "AI_MISC" },
  { code: 'NA-FLSE', name: "Seminole Indians", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_FLSE.html", wlpStem: "AI_FLSE" },
  { code: 'NA-OKSE', name: "Seminole Nation", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKSE.html", wlpStem: "AI_OKSE" },
  { code: 'NA-OKSC', name: "Seneca Cayuga Tribe", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKSC.html", wlpStem: "AI_OKSC" },
  { code: 'NA-OKSH', name: "Shawnee Tribe", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKSH.html", wlpStem: "AI_OKSH" },
  { code: 'NA-NDSL', name: "Spirit Lake Sioux Tribe", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_NDSL.html", wlpStem: "AI_NDSL" },
  { code: 'NA-OKTO', name: "Tonkawa Tribe", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKTO.html", wlpStem: "AI_OKTO" },
  { code: 'NA-NDTM', name: "Turtle Mountain Chippewa", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_NDTM.html", wlpStem: "AI_NDTM" },
  { code: 'NA-MNWE', name: "White Earth Band of Chippewa", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_MNWE.html", wlpStem: "AI_MNWE" },
  { code: 'NA-OKWI', name: "Wichita, Waco, Keechi, Tawakonie Tribes", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKWI.html", wlpStem: "AI_OKWI" },
  { code: 'NA-OKWY', name: "Wyandotte Nation", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_OKWY.html", wlpStem: "AI_OKWY" },
  { code: 'NA-TXYS', name: "Ysleta Del Sur Pueblo", region: 'native', rarity: 'rare', notes: "Tribal / Native American plates documented by World License Plates; rare outside tribal and nearby regions.", wlpPath: "usa/AI_TXYS.html", wlpStem: "AI_TXYS" },

  // —— Federal / special ——
  { code: 'US-GOV', name: 'U.S. Government', region: 'federal', rarity: 'uncommon', notes: 'Federal government plates.', wlpPath: 'usa/US_XGVT.html', wlpStem: 'US_XGVT' },
  { code: 'US-DEPT', name: 'Federal departments & agencies', region: 'federal', rarity: 'uncommon', notes: 'Department and agency plates.', wlpPath: 'usa/US_XGOV.html', wlpStem: 'US_XGOV' },
  { code: 'US-NPS', name: 'National Parks', region: 'federal', rarity: 'rare', notes: 'Park-related plates.', wlpPath: 'usa/US_XNPS.html', wlpStem: 'US_XNPS' },
]

export function getJurisdiction(code: string): Jurisdiction | undefined {
  const c = code.toUpperCase()
  return JURISDICTIONS.find((j) => j.code.toUpperCase() === c)
}

export function jurisdictionsByRegion(region: Region): Jurisdiction[] {
  return JURISDICTIONS.filter((j) => j.region === region).sort((a, b) => a.name.localeCompare(b.name))
}

export function rarityLabel(rarity: Jurisdiction['rarity']): string {
  switch (rarity) {
    case 'common':
      return 'Common in most regions'
    case 'uncommon':
      return 'Uncommon outside home region'
    case 'rare':
      return 'Rare away from home area'
    case 'very-rare':
      return 'Very rare in most of the US'
  }
}

export function plateMountLabel(mount?: PlateMount): string {
  if (mount === 'rear') return 'One plate (rear only)'
  if (mount === 'both') return 'Two plates (front and rear)'
  if (mount === 'varies') return 'One or two plates (varies)'
  return 'Plate mount rules vary'
}
