import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  // `relative` supports the `after:` hit-area expansion on the small sizes.
  // The focus ring gained an offset and real opacity: at `ring-blue-500/40`
  // with no offset it was drawn over the button's own edge and all but
  // invisible against a filled variant.
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary:
          'bg-linear-to-b from-blue-600 to-blue-700 text-white shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_1px_2px_rgba(15,23,42,0.08),0_8px_16px_-6px_rgba(29,78,216,0.45)] hover:from-blue-500 hover:to-blue-600 hover:shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_1px_2px_rgba(15,23,42,0.08),0_10px_20px_-6px_rgba(29,78,216,0.55)]',
        secondary: 'bg-white text-slate-700 border border-slate-200 shadow-xs hover:border-slate-300 hover:bg-slate-50',
        ghost: 'text-slate-600 hover:bg-slate-100',
        navy: 'bg-linear-to-b from-navy-800 to-navy-900 text-white shadow-[0_1px_0_0_rgba(255,255,255,0.1)_inset,0_8px_16px_-6px_rgba(7,26,61,0.5)] hover:from-navy-700 hover:to-navy-800',
        outline: 'border border-white/25 text-white hover:bg-white/10',
      },
      size: {
        // `sm`, `md` and `icon` render at 32-36px, below the 44px touch
        // floor. Rather than grow them — which would rebuild the navbar's
        // proportions — each gets an invisible `after:` layer padded out to
        // 44px, so the thumb target meets the floor while the button looks
        // exactly as it did. `lg` is already 44px and needs none.
        sm: "h-8 px-3 text-xs after:absolute after:left-0 after:top-1/2 after:h-11 after:w-full after:-translate-y-1/2 after:content-['']",
        md: "h-9 px-4 after:absolute after:left-0 after:top-1/2 after:h-11 after:w-full after:-translate-y-1/2 after:content-['']",
        lg: 'h-11 px-5 text-[17px]',
        icon: "h-9 w-9 after:absolute after:left-1/2 after:top-1/2 after:h-11 after:w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']",
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
})
Button.displayName = 'Button'
