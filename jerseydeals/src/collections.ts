/** Marketing collections for the landing-page rail. */
export type CollectionAction = {
  brand?: string
  tag?: string
  price?: 'under-25' | '25-40' | '40-plus' | 'All'
  /** Curated sale rack (see isSaleListing). */
  saleOnly?: boolean
  query?: string
  leagueId?: string
  reset?: boolean
}

export type CollectionItem = {
  id: string
  label: string
  image: string
  action: CollectionAction
}

export const LANDING_COLLECTIONS: CollectionItem[] = [
  {
    id: 'jersey-deals',
    label: 'Jersey Deals',
    image: 'collections/jerseydeals.jpg',
    action: { reset: true },
  },
  {
    id: 'nike',
    label: 'Nike',
    image: 'collections/nike.jpg',
    action: { brand: 'Nike', reset: true },
  },
  {
    id: 'adidas',
    label: 'Adidas',
    image: 'collections/adidas.jpg',
    action: { brand: 'Adidas', reset: true },
  },
  {
    id: 'puma',
    label: 'Puma',
    image: 'collections/puma.jpg',
    action: { brand: 'Puma', reset: true },
  },
  {
    id: 'under-armour',
    label: 'Under Armour',
    image: 'collections/under-armour.jpg',
    action: { brand: 'Under Armour', reset: true },
  },
  {
    id: 'columbia',
    label: 'Columbia',
    image: 'collections/columbia.jpg',
    action: { brand: 'Columbia', reset: true },
  },
  {
    id: 'club-kits',
    label: 'Club kits',
    image: 'collections/club.jpg',
    action: { tag: 'Jerseys', reset: true },
  },
  {
    id: 'country-kits',
    label: 'Country kits',
    image: 'collections/country.jpg',
    action: { leagueId: 'international', reset: true },
  },
  {
    id: 'training',
    label: 'Training',
    image: 'collections/training.jpg?v=turf1',
    action: { tag: 'Training', reset: true },
  },
  {
    id: 'pre-match',
    label: 'Pre-match',
    image: 'collections/prematch.jpg',
    action: { query: 'pre-match', tag: 'Training', reset: true },
  },
  {
    id: 'sale-rack',
    label: 'Sale rack',
    image: 'collections/sale.jpg',
    action: { saleOnly: true, reset: true },
  },
]
