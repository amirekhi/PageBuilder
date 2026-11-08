// Extracts complete top-level JSON objects from an arbitrary text stream.
// More forgiving than "one object per line": tolerates code fences, prose,
// wrapping [ ... ] arrays, pretty-printed objects and objects split across
// network chunks. Pure (no imports) — used server-side in route.ts.

export class JsonObjectStream {
  private depth = 0
  private inStr = false
  private esc = false
  private buf = ''

  push(text: string): unknown[] {
    const out: unknown[] = []
    for (const ch of text) {
      if (this.depth === 0) {
        if (ch === '{') { this.depth = 1; this.buf = '{'; this.inStr = false; this.esc = false }
        continue
      }
      this.buf += ch
      if (this.inStr) {
        if (this.esc) this.esc = false
        else if (ch === '\\') this.esc = true
        else if (ch === '"') this.inStr = false
        continue
      }
      if (ch === '"') this.inStr = true
      else if (ch === '{') this.depth++
      else if (ch === '}') {
        this.depth--
        if (this.depth === 0) {
          try { out.push(JSON.parse(this.buf)) } catch { /* skip malformed object */ }
          this.buf = ''
        }
      }
    }
    return out
  }
}
