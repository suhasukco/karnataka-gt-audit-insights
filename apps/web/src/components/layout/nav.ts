import { Cpu, Home, Lightbulb, MapPinned, Tag, TrendingUp, type LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Live Data',
    items: [
      { label: 'Home', path: '/', icon: Home },
      { label: 'Geography & Outlets', path: '/live/geography', icon: MapPinned },
      { label: 'Infrastructure & Digital', path: '/live/infrastructure', icon: Cpu },
      { label: 'Category & Brand', path: '/live/category-brand', icon: Tag },
      { label: 'Sales & Opportunity', path: '/live/sales-opportunity', icon: TrendingUp },
      // Last in the section deliberately: the four above are the raw lenses,
      // this one is what the census concludes from them.
      { label: 'Insights', path: '/live/insights', icon: Lightbulb },
    ],
  },
]

// Flattened for anything that just needs "every route" (e.g. active-path checks).
export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items)
