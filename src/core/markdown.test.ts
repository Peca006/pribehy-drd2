import { describe, expect, it } from 'vitest'
import { parseInline } from './markdown'

describe('parseInline', () => {
  it('rozpozná kurzívu, tučné a herní pojem', () => {
    expect(parseInline('a *b* **c** ***d***')).toEqual([
      { t: 'text', v: 'a ' },
      { t: 'em', c: [{ t: 'text', v: 'b' }] },
      { t: 'text', v: ' ' },
      { t: 'strong', c: [{ t: 'text', v: 'c' }] },
      { t: 'text', v: ' ' },
      { t: 'term', c: [{ t: 'text', v: 'd' }] },
    ])
  })
  it('odkazy a vnořené značky', () => {
    expect(parseInline('viz [*boj*](chapter:31-x#boj)')).toEqual([
      { t: 'text', v: 'viz ' },
      { t: 'link', href: 'chapter:31-x#boj', c: [{ t: 'em', c: [{ t: 'text', v: 'boj' }] }] },
    ])
  })
  it('neuzavřená značka zůstane textem', () => {
    expect(parseInline('5 * 3 a **x')).toEqual([{ t: 'text', v: '5 * 3 a **x' }])
  })
})
