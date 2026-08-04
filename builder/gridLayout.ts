// gridLayout.ts
//
// Single source of truth for "which child occupies which cell" in a Grid
// node. Both RenderEditorNode and RenderPreviewNode (Renderer.tsx) call
// this SAME pure function with the SAME inputs (childIds, nodes, cols,
// rows) — so Editor and Preview can never disagree about placement again.
// It's deterministic with no side effects, so calling it fresh on every
// render is fine (grids here max out at a handful of cells).
//
// Placement source of truth, in priority order, per child:
//   1. Explicit gridColStart/gridRowStart on the child's own style (set by
//      GridCellSlot when a block is added into a specific empty cell — see
//      DropSlot.tsx — or by the grid-cell drag-and-drop drop target in
//      Renderer.tsx's handleDragEnd).
//   2. If those are unset, OR they'd overlap something already placed
//      (e.g. after the user shrinks gridCols/gridRows, or for legacy/
//      template-authored children that never got explicit coords), fall
//      back to the first free origin found via a top-left-to-bottom-right
//      scan — the same "dense packing" a CSS gridAutoFlow:dense algorithm
//      would produce. This fallback is intentionally NOT persisted back
//      onto the node: since it's a pure function of stable inputs, it comes
//      out identically every time, in both Editor and Preview, with no
//      write needed.

import type { NodeMap } from './types'
import type { StyleProps } from './styleMapper'

export interface GridCellOrigin {
  childId: string
  row:     number
  col:     number
  rowSpan: number
  colSpan: number
}

export interface GridOccupancy {
  // Every cell key "row-col" covered by ANY child, including cells covered
  // only because a spanning child's origin lies elsewhere. Used to decide
  // whether an empty-looking cell actually needs a GridCellSlot.
  occupied: Set<string>
  // Only the TOP-LEFT origin cell of each child, keyed "row-col" — this is
  // where the actual child gets rendered; every other cell it covers is
  // skipped during render (already painted by this one child spanning over
  // it).
  originByCell: Map<string, GridCellOrigin>
}

export function computeGridOccupancy(
  childIds: string[],
  nodes:    NodeMap,
  cols:     number,
  rows:     number,
): GridOccupancy {
  const occupied     = new Map<string, string>() // cellKey -> childId
  const originByCell = new Map<string, GridCellOrigin>()

  function isFree(r: number, c: number, rowSpan: number, colSpan: number): boolean {
    for (let dr = 0; dr < rowSpan; dr++)
      for (let dc = 0; dc < colSpan; dc++)
        if (occupied.has(`${r + dr}-${c + dc}`)) return false
    return true
  }

  // Top-left-to-bottom-right scan for the first origin where a rowSpan x
  // colSpan block fits entirely within bounds and entirely on free cells.
  function findFreeOrigin(rowSpan: number, colSpan: number): { r: number; c: number } | null {
    for (let r = 1; r <= rows - rowSpan + 1; r++) {
      for (let c = 1; c <= cols - colSpan + 1; c++) {
        if (isFree(r, c, rowSpan, colSpan)) return { r, c }
      }
    }
    return null
  }

  for (const id of childIds) {
    const style   = (nodes[id]?.props.style as StyleProps) ?? {}
    const colSpan = Math.max(1, Math.min(style.gridColSpan ?? 1, cols))
    const rowSpan = Math.max(1, Math.min(style.gridRowSpan ?? 1, rows))

    let start: { r: number; c: number } | null = null

    if (style.gridRowStart && style.gridColStart) {
      const r = style.gridRowStart
      const c = Math.min(style.gridColStart, cols - colSpan + 1)
      if (r >= 1 && r <= rows - rowSpan + 1 && c >= 1 && isFree(r, c, rowSpan, colSpan)) {
        start = { r, c }
      }
      // else: explicit coords are stale/out-of-bounds/overlapping (e.g.
      // gridCols shrank since this was placed) — fall through to auto-place
    }

    if (!start) start = findFreeOrigin(rowSpan, colSpan)
    if (!start) continue // grid genuinely has no room left for this child

    for (let dr = 0; dr < rowSpan; dr++)
      for (let dc = 0; dc < colSpan; dc++)
        occupied.set(`${start.r + dr}-${start.c + dc}`, id)

    originByCell.set(`${start.r}-${start.c}`, {
      childId: id, row: start.r, col: start.c, rowSpan, colSpan,
    })
  }

  return { occupied: new Set(occupied.keys()), originByCell }
}