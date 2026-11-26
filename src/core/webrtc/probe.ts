// Průzkum WebRTC (PLAN-WEBRTC.md, etapa 0): pomocné funkce zkušební stránky Dílna → Test WebRTC.
// Po rozhodnutí o signalizaci se tenhle soubor i stránka odstraní.

export interface CandidateInfo {
  type: string
  protocol: string
  address: string
  /** adresa skrytá za jméno `xxxx.local` (mDNS): druhá strana ji musí umět přeložit */
  mdns: boolean
}

export interface SdpSummary {
  size: number
  candidates: CandidateInfo[]
}

/** Z textu SDP vytáhne kandidáty (typ, protokol, adresa) a velikost. */
export function summarizeSdp(sdp: string): SdpSummary {
  const candidates: CandidateInfo[] = []
  for (const line of sdp.split(/\r?\n/)) {
    const m = /^a=candidate:\S+ \d+ (\w+) \d+ (\S+) \d+ typ (\w+)/.exec(line)
    if (m) candidates.push({ protocol: m[1].toLowerCase(), address: m[2], type: m[3], mdns: m[2].endsWith('.local') })
  }
  return { size: sdp.length, candidates }
}

/** Počká, až prohlížeč dokončí sbírání kandidátů (nebo uplyne limit). */
export function waitForIce(pc: RTCPeerConnection, ms = 5000): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve()
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(t)
      pc.removeEventListener('icegatheringstatechange', check)
      resolve()
    }
    const check = () => pc.iceGatheringState === 'complete' && done()
    const t = setTimeout(done, ms)
    pc.addEventListener('icegatheringstatechange', check)
  })
}

/** Popis vybrané dvojice kandidátů („host udp ⇄ host udp“) z `getStats`. */
export async function selectedPair(pc: RTCPeerConnection): Promise<string> {
  const stats = await pc.getStats()
  const byId = new Map<string, Record<string, unknown>>()
  stats.forEach((s) => byId.set(s.id, s))
  let pair: Record<string, unknown> | undefined
  stats.forEach((s) => {
    if (s.type === 'transport' && s.selectedCandidatePairId) pair = byId.get(s.selectedCandidatePairId)
  })
  if (!pair)
    stats.forEach((s) => {
      if (s.type === 'candidate-pair' && s.state === 'succeeded' && (s.nominated || s.selected)) pair = s
    })
  if (!pair) return 'zatím žádná'
  const one = (id: unknown) => {
    const c = typeof id === 'string' ? byId.get(id) : undefined
    return c ? `${String(c.candidateType)} ${String(c.protocol)} ${String(c.address ?? c.ip ?? '?')}` : '?'
  }
  return `${one(pair.localCandidateId)} ⇄ ${one(pair.remoteCandidateId)}`
}
