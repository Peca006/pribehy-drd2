import { describe, expect, it } from 'vitest'
import { summarizeSdp } from './probe'

describe('průzkum WebRTC: souhrn SDP', () => {
  it('vytáhne kandidáty, pozná adresy .local a spočítá velikost', () => {
    const sdp = [
      'v=0',
      'a=candidate:1 1 udp 2113937151 3f2a7c1e-9b0d-4c4e-8b6b-0a1b2c3d4e5f.local 54321 typ host generation 0',
      'a=candidate:2 1 UDP 1677729535 203.0.113.7 54321 typ srflx raddr 0.0.0.0 rport 0',
      'a=candidate:3 1 tcp 1518280447 192.168.43.1 9 typ host tcptype active',
      'a=fingerprint:sha-256 AA:BB',
    ].join('\r\n')
    const s = summarizeSdp(sdp)
    expect(s.size).toBe(sdp.length)
    expect(s.candidates).toEqual([
      { protocol: 'udp', address: '3f2a7c1e-9b0d-4c4e-8b6b-0a1b2c3d4e5f.local', type: 'host', mdns: true },
      { protocol: 'udp', address: '203.0.113.7', type: 'srflx', mdns: false },
      { protocol: 'tcp', address: '192.168.43.1', type: 'host', mdns: false },
    ])
  })

  it('bez kandidátů vrátí prázdný seznam', () => {
    expect(summarizeSdp('v=0\r\na=fingerprint:sha-256 AA').candidates).toEqual([])
  })
})
