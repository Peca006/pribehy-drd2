import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { seedDemoOnce } from './core/demo'
import { settings } from './core/settings.svelte'
import { startSkinRuntime } from './core/skin/runtime'

// vzhled: výchozí se použije hned, zvolený Háv se doplní po načtení úložiště (chyba úložiště aplikaci nezastaví)
await startSkinRuntime().catch(() => undefined)

// při úplně prvním použití se nejdřív nainstalují ukázková data (chyba úložiště aplikaci nezastaví)
await seedDemoOnce(settings.author).catch(() => false)

const app = mount(App, { target: document.getElementById('app')! })
export default app
