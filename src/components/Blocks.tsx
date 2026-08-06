interface BlocksProps {
  /** Cells as [col, row]. */
  cells: ReadonlyArray<readonly [number, number]>
  /** CSS color per cell, or one color for all. */
  color: string | string[]
  /** Cell size in px. */
  size?: number
  className?: string
}

/** A little cluster of physical-looking tetromino cells, built from CSS. */
export function Blocks({ cells, color, size = 16, className }: BlocksProps) {
  const cols = Math.max(...cells.map(([c]) => c)) + 1
  const rows = Math.max(...cells.map(([, r]) => r)) + 1
  return (
    <div
      aria-hidden
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, ${size}px)`,
        gridTemplateRows: `repeat(${rows}, ${size}px)`,
        gap: 2,
      }}
    >
      {cells.map(([c, r], i) => (
        <div
          key={i}
          className="block-cell"
          style={{
            gridColumn: c + 1,
            gridRow: r + 1,
            background: Array.isArray(color) ? color[i % color.length] : color,
          }}
        />
      ))}
    </div>
  )
}
