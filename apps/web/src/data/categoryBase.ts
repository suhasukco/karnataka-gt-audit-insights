export interface CategoryBase {
  id: string
  name: string
  group: 'Food' | 'Beverages' | 'Personal Care' | 'Home Care' | 'Others'
  baseAvailability: number // 0-100, seed value before per-district noise
}

// 22 categories tracked across the census, roughly ordered by shelf ubiquity.
export const CATEGORY_BASE: CategoryBase[] = [
  { id: 'packaged-foods', name: 'Packaged Foods', group: 'Food', baseAvailability: 92 },
  { id: 'beverages', name: 'Beverages', group: 'Beverages', baseAvailability: 88 },
  { id: 'dairy', name: 'Dairy', group: 'Food', baseAvailability: 78 },
  { id: 'snacks', name: 'Snacks', group: 'Food', baseAvailability: 76 },
  { id: 'personal-care', name: 'Personal Care', group: 'Personal Care', baseAvailability: 72 },
  { id: 'home-care', name: 'Home Care', group: 'Home Care', baseAvailability: 63 },
  { id: 'bakery', name: 'Bakery', group: 'Food', baseAvailability: 58 },
  { id: 'confectionery', name: 'Confectionery', group: 'Food', baseAvailability: 52 },
  { id: 'pan-masala', name: 'Pan Masala', group: 'Others', baseAvailability: 40 },
  { id: 'stationery', name: 'Stationery', group: 'Others', baseAvailability: 45 },
  { id: 'staples-grocery', name: 'Staples & Grocery', group: 'Food', baseAvailability: 84 },
  { id: 'edible-oils', name: 'Edible Oils', group: 'Food', baseAvailability: 74 },
  { id: 'spices-masala', name: 'Spices & Masala', group: 'Food', baseAvailability: 69 },
  { id: 'tea-coffee', name: 'Tea & Coffee', group: 'Beverages', baseAvailability: 81 },
  { id: 'soft-drinks', name: 'Soft Drinks', group: 'Beverages', baseAvailability: 66 },
  { id: 'ice-cream-frozen', name: 'Ice Cream & Frozen', group: 'Food', baseAvailability: 34 },
  { id: 'baby-care', name: 'Baby Care', group: 'Personal Care', baseAvailability: 18 },
  { id: 'health-wellness', name: 'Health & Wellness', group: 'Personal Care', baseAvailability: 22 },
  { id: 'premium-beauty', name: 'Premium Beauty', group: 'Personal Care', baseAvailability: 25 },
  { id: 'organic-foods', name: 'Organic Foods', group: 'Food', baseAvailability: 15 },
  { id: 'pet-care', name: 'Pet Care', group: 'Others', baseAvailability: 12 },
  { id: 'tobacco', name: 'Tobacco Products', group: 'Others', baseAvailability: 55 },
]
