interface ToggleProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

/** Toy switch: a little block sliding in a sunken tray. */
export function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-6 rounded-lg px-1 py-1.5 text-sm font-semibold"
    >
      <span>{label}</span>
      <span aria-hidden className="tray relative h-7 w-12 shrink-0">
        <span
          className={`block-cell absolute top-1 left-1 size-5 transition-transform duration-150 ease-out motion-reduce:transition-none ${
            checked ? 'translate-x-5 bg-accent' : 'bg-surface-raised'
          }`}
        />
      </span>
    </button>
  )
}
