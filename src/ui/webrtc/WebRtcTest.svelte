<script lang="ts">
  import { onDestroy } from 'svelte'
  import { decodeJson, encodeJson } from '../../core/character/share'
  import { fromScan, loadAssembler, saveAssembler, splitForQr } from '../../core/character/qr'
  import { selectedPair, summarizeSdp, waitForIce, type SdpSummary } from '../../core/webrtc/probe'
  import QrScanner from '../QrScanner.svelte'
  import QrView from '../QrView.svelte'

  // Zkušební stránka průzkumu WebRTC (PLAN-WEBRTC.md, etapa 0). Propojí dvě zařízení bez serveru: A vytvoří nabídku,
  // B ji načte (QR nebo vložený text) a vrátí odpověď, A ji načte. Pak se měří spojení. Po průzkumu se odstraní.

  type Role = '' | 'A' | 'B'
  let role = $state<Role>('')
  let stun = $state(false)
  let busy = $state(false)
  let error = $state('')
  let offerCode = $state('')
  let answerCode = $state('')
  let incoming = $state('')
  let summaryOut = $state.raw<SdpSummary | undefined>(undefined)
  let connection = $state('nespojeno')
  let ice = $state('')
  let channel = $state('')
  let pair = $state('')
  let rtt = $state<number | undefined>(undefined)
  let lost = $state(0)
  let log = $state<string[]>([])
  let msg = $state('')
  let scanning = $state(false)
  let scanInfo = $state('')
  let scanner = $state<{ stop: () => void } | undefined>(undefined)

  let pc = $state.raw<RTCPeerConnection | undefined>(undefined)
  let dc: RTCDataChannel | undefined
  let timer: ReturnType<typeof setInterval> | undefined
  let pending = new Map<number, number>()
  let seq = 0
  const assembler = loadAssembler()

  const say = (s: string) => (log = [`${new Date().toLocaleTimeString('cs-CZ')} ${s}`, ...log].slice(0, 40))

  function make(): RTCPeerConnection {
    reset(false)
    const p = new RTCPeerConnection({ iceServers: stun ? [{ urls: 'stun:stun.l.google.com:19302' }] : [] })
    p.onconnectionstatechange = () => {
      connection = p.connectionState
      say(`spojení: ${p.connectionState}`)
      if (p.connectionState === 'connected') void refreshPair()
    }
    p.oniceconnectionstatechange = () => (ice = p.iceConnectionState)
    pc = p
    return p
  }
  function wire(c: RTCDataChannel) {
    dc = c
    c.onopen = () => {
      channel = 'otevřený'
      say('datový kanál otevřen')
      timer = setInterval(ping, 2000)
      void refreshPair()
    }
    c.onclose = () => {
      channel = 'zavřený'
      say('datový kanál zavřen')
      clearInterval(timer)
    }
    c.onmessage = (e) => {
      const t = String(e.data)
      if (t.startsWith('ping:')) c.send('pong:' + t.slice(5))
      else if (t.startsWith('pong:')) {
        const n = Number(t.slice(5))
        const at = pending.get(n)
        if (at !== undefined) {
          rtt = Math.round(performance.now() - at)
          pending.delete(n)
        }
      } else say('přijato: ' + t)
    }
  }
  function ping() {
    if (dc?.readyState !== 'open') return
    lost += [...pending.values()].filter((at) => performance.now() - at > 5000).length
    for (const [k, at] of pending) if (performance.now() - at > 5000) pending.delete(k)
    pending.set(++seq, performance.now())
    dc.send('ping:' + seq)
  }
  async function refreshPair() {
    if (pc) pair = await selectedPair(pc)
  }

  async function pack(type: 'offer' | 'answer', sdp: string): Promise<string> {
    return encodeJson({ t: 'drd2-webrtc', type, sdp })
  }
  async function unpack(text: string, type: 'offer' | 'answer'): Promise<string> {
    const v = (await decodeJson(text)) as { t?: unknown; type?: unknown; sdp?: unknown }
    if (v?.t !== 'drd2-webrtc' || v.type !== type || typeof v.sdp !== 'string')
      throw new Error(type === 'offer' ? 'To není nabídka (kód od zařízení A).' : 'To není odpověď (kód od zařízení B).')
    return v.sdp
  }

  async function run(fn: () => Promise<void>) {
    busy = true
    error = ''
    try {
      await fn()
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
      say('chyba: ' + error)
    } finally {
      busy = false
    }
  }

  const createOffer = () =>
    run(async () => {
      role = 'A'
      const p = make()
      wire(p.createDataChannel('drd2'))
      await p.setLocalDescription(await p.createOffer())
      say('sbírám kandidáty…')
      await waitForIce(p)
      const sdp = p.localDescription!.sdp
      summaryOut = summarizeSdp(sdp)
      offerCode = await pack('offer', sdp)
      say(`nabídka hotová (${offerCode.length} znaků, QR dílů: ${splitForQr(offerCode).length})`)
    })

  const acceptOffer = () =>
    run(async () => {
      role = 'B'
      const sdp = await unpack(incoming, 'offer')
      const p = make()
      p.ondatachannel = (e) => wire(e.channel)
      await p.setRemoteDescription({ type: 'offer', sdp })
      await p.setLocalDescription(await p.createAnswer())
      say('sbírám kandidáty…')
      await waitForIce(p)
      const out = p.localDescription!.sdp
      summaryOut = summarizeSdp(out)
      answerCode = await pack('answer', out)
      incoming = ''
      say(`odpověď hotová (${answerCode.length} znaků, QR dílů: ${splitForQr(answerCode).length})`)
    })

  const acceptAnswer = () =>
    run(async () => {
      if (!pc) throw new Error('Nejdřív vytvořte nabídku.')
      const sdp = await unpack(incoming, 'answer')
      await pc.setRemoteDescription({ type: 'answer', sdp })
      incoming = ''
      say('odpověď přijata, spojuji…')
    })

  function reset(clearLog = true) {
    clearInterval(timer)
    dc?.close()
    pc?.close()
    pc = dc = undefined
    pending = new Map()
    connection = 'nespojeno'
    ice = channel = pair = ''
    rtt = undefined
    lost = 0
    if (clearLog) {
      role = ''
      offerCode = answerCode = incoming = ''
      summaryOut = undefined
      error = ''
      log = []
    }
  }
  onDestroy(() => reset(false))

  function send() {
    if (dc?.readyState === 'open' && msg.trim()) {
      dc.send(msg)
      say('odesláno: ' + msg)
      msg = ''
    }
  }

  async function onscan(t: string) {
    const s = assembler.add(fromScan(t))
    saveAssembler(assembler)
    if (s.status === 'partial') scanInfo = `Naskenováno ${s.have} z ${s.total} QR…`
    else if (s.status === 'complete') {
      scanInfo = ''
      scanner?.stop()
      scanning = false
      incoming = s.code
      assembler.reset()
      saveAssembler(assembler)
    }
  }

  // --- poznámky ze zkoušek ---
  const KEY = 'drd2-webrtc-test'
  const SCENARIOS = [
    ['hotspot', 'Hotspot z Androidu, druhý telefon se připojí k jeho Wi-Fi'],
    ['wifi', 'Telefon a počítač na domácí Wi-Fi'],
    ['iphone', 'iPhone (Safari či aplikace) s Androidem nebo počítačem'],
    ['bez-internetu', 'Bez internetu (hotspot bez mobilních dat nebo router odpojený od internetu)'],
    ['qr', 'Nabídka a odpověď přes QR (skener v aplikaci)'],
    ['text', 'Nabídka a odpověď vloženým textem (zpráva, e-mail)'],
    ['displej', 'Zhasnutý displej na 30 s a pak ping (spojení přežije?)'],
    ['izolace', 'Host Wi-Fi s izolací klientů (očekává se selhání; zapsat)'],
    ['stun', 'Stejné zařízení s volbou veřejného STUN (jen když nic jiného nejde)'],
  ] as const
  interface Row {
    done: boolean
    result: '' | 'ok' | 'ko'
    note: string
  }
  const load = (): { rows: Record<string, Row>; note: string } => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) ?? '{}')
      return { rows: v.rows ?? {}, note: typeof v.note === 'string' ? v.note : '' }
    } catch {
      return { rows: {}, note: '' }
    }
  }
  const initial = load()
  let rows = $state<Record<string, Row>>(initial.rows)
  let generalNote = $state(initial.note)
  // řádky se založí hned (zápis do stavu při vykreslování by Svelte odmítl)
  for (const [id] of SCENARIOS) rows[id] ??= { done: false, result: '', note: '' }
  const row = (id: string): Row => rows[id]
  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ rows: $state.snapshot(rows), note: generalNote }))
    } catch {
      /* bez uložení to funguje, jen se poznámky nezapamatují */
    }
  }
  let copied = $state(false)
  async function copyResults() {
    const lines = SCENARIOS.map(([id, label]) => {
      const r = row(id)
      return `${r.done ? '[x]' : '[ ]'} ${label}: ${r.result ? r.result.toUpperCase() : '-'}${r.note ? ' | ' + r.note : ''}`
    })
    const text = `Test WebRTC\n${lines.join('\n')}\n${generalNote ? '\nPoznámka: ' + generalNote : ''}`
    try {
      await navigator.clipboard.writeText(text)
      copied = true
      setTimeout(() => (copied = false), 2000)
    } catch {
      /* schránka není dostupná */
    }
  }
</script>

<div class="webrtc">
  <p class="muted">
    Průzkum pro přenosy mezi zařízeními bez serveru (plán: <code>PLAN-WEBRTC.md</code>, etapa 0). Cílem je zjistit, zda se
    dvě zařízení propojí na hotspotu či Wi-Fi a bez internetu.
  </p>
  <ol class="how">
    <li>Na obou zařízeních otevřete tuto sekci. Zařízení spojte se stejnou Wi-Fi nebo hotspotem (internet není potřeba).</li>
    <li><strong>A:</strong> Vytvořit nabídku, počkejte na kód. <strong>B:</strong> načtěte nabídku (QR nebo vložený text), Vytvořit odpověď.</li>
    <li><strong>A:</strong> načtěte odpověď a Spojit. Po spojení běží ping každé 2 s; zkuste i poslat zprávu.</li>
    <li>Výsledek zapište níže (otestováno, OK či KO, poznámka). Sledujte hlavně <em>Vybraná dvojice</em> a to, zda kandidáti mají adresy <code>.local</code>.</li>
  </ol>

  <label class="check"><input type="checkbox" bind:checked={stun} disabled={!!pc} /> Veřejný STUN (jen k porovnání; uvidí ho server Google, vypnuto = jen lokální síť)</label>

  <p class="actions">
    <button class="primary" disabled={busy || role === 'B'} onclick={createOffer}>A: Vytvořit nabídku</button>
    <button disabled={busy || role === 'A'} onclick={() => (role = 'B')}>B: Připojit se</button>
    <button onclick={() => reset()}>Začít znovu</button>
  </p>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  {#if busy}<p class="muted" role="status">Pracuji…</p>{/if}

  {#if role === 'A' && offerCode}
    <h3>A: nabídka pro zařízení B</h3>
    <textarea rows="3" readonly value={offerCode} aria-label="Kód nabídky"></textarea>
    <QrView code={offerCode} />
  {/if}
  {#if role === 'B' && answerCode}
    <h3>B: odpověď pro zařízení A</h3>
    <textarea rows="3" readonly value={answerCode} aria-label="Kód odpovědi"></textarea>
    <QrView code={answerCode} />
  {/if}

  {#if (role === 'B' && !answerCode) || (role === 'A' && offerCode && connection !== 'connected')}
    <h3>{role === 'B' ? 'B: načíst nabídku od A' : 'A: načíst odpověď od B'}</h3>
    <p class="actions">
      <button onclick={() => (scanning = !scanning)}>{scanning ? 'Skrýt kameru' : 'Naskenovat QR'}</button>
    </p>
    {#if scanning}<QrScanner bind:this={scanner} {onscan} />{/if}
    {#if scanInfo}<p role="status">{scanInfo}</p>{/if}
    <textarea rows="3" bind:value={incoming} placeholder="Sem vložte kód…" aria-label="Kód od druhého zařízení"></textarea>
    <p>
      <button class="primary" disabled={busy || !incoming.trim()} onclick={role === 'B' ? acceptOffer : acceptAnswer}>
        {role === 'B' ? 'Vytvořit odpověď' : 'Spojit'}
      </button>
    </p>
  {/if}

  {#if summaryOut}
    <h3>Moje kandidáty ({summaryOut.candidates.length})</h3>
    <p class="muted">SDP má {summaryOut.size} znaků. Adresa <code>.local</code> znamená, že prohlížeč skryl IP a druhá strana ji musí přeložit.</p>
    <ul class="list">
      {#each summaryOut.candidates as c}
        <li>{c.type} {c.protocol} {c.address}{c.mdns ? ' (mDNS)' : ''}</li>
      {:else}
        <li class="error">Žádný kandidát: spojení nepůjde.</li>
      {/each}
    </ul>
  {/if}

  {#if pc}
    <h3>Stav</h3>
    <table class="status">
      <tbody>
        <tr><th>Spojení</th><td>{connection}</td></tr>
        <tr><th>ICE</th><td>{ice || '–'}</td></tr>
        <tr><th>Kanál</th><td>{channel || '–'}</td></tr>
        <tr><th>Vybraná dvojice</th><td>{pair || '–'} <button onclick={refreshPair}>Obnovit</button></td></tr>
        <tr><th>Odezva (ping)</th><td>{rtt === undefined ? '–' : rtt + ' ms'}{lost ? `, ztraceno: ${lost}` : ''}</td></tr>
      </tbody>
    </table>
    <label class="send">
      Zpráva
      <input bind:value={msg} onkeydown={(e) => e.key === 'Enter' && send()} />
    </label>
    <p><button disabled={channel !== 'otevřený'} onclick={send}>Poslat</button></p>
  {/if}
  {#if log.length}
    <h3>Záznam</h3>
    <pre class="log">{log.join('\n')}</pre>
  {/if}

  <h3>Moje zkoušky</h3>
  <p class="muted">Ukládá se jen v tomto zařízení. Poznamenejte si, co jste zkusili a jak to dopadlo.</p>
  {#each SCENARIOS as [id, label] (id)}
    {@const r = row(id)}
    <div class="panel scenario">
      <label class="check">
        <input type="checkbox" bind:checked={r.done} onchange={persist} />
        <span>{label}</span>
      </label>
      <div class="result" role="radiogroup" aria-label={'Výsledek: ' + label}>
        <label><input type="radio" name={'r-' + id} value="ok" bind:group={r.result} onchange={persist} /> OK</label>
        <label><input type="radio" name={'r-' + id} value="ko" bind:group={r.result} onchange={persist} /> KO</label>
      </div>
      <input bind:value={r.note} onchange={persist} placeholder="Poznámka (zařízení, co se stalo)" aria-label={'Poznámka: ' + label} />
    </div>
  {/each}
  <label>
    Obecná poznámka
    <textarea rows="3" bind:value={generalNote} onchange={persist}></textarea>
  </label>
  <p><button onclick={copyResults}>{copied ? 'Zkopírováno ✓' : 'Zkopírovat výsledky'}</button></p>
</div>

<style>
  .how {
    padding-left: 1.2rem;
    font-size: 0.9rem;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  textarea {
    font-family: monospace;
    font-size: 0.75rem;
  }
  .check {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
  }
  .check input,
  .result input {
    width: auto;
    min-height: 0;
  }
  .result {
    display: flex;
    gap: 1rem;
    margin: 0.25rem 0;
  }
  .result label {
    display: flex;
    gap: 0.3rem;
    align-items: center;
  }
  .list {
    list-style: none;
    padding-left: 0.5rem;
    font-family: monospace;
    font-size: 0.8rem;
  }
  .status th {
    text-align: left;
    padding-right: 0.75rem;
    font-weight: normal;
    color: var(--drd-muted, inherit);
  }
  .log {
    white-space: pre-wrap;
    font-size: 0.75rem;
    max-height: 14rem;
    overflow: auto;
  }
  .scenario {
    margin: 0.4rem 0;
  }
</style>
