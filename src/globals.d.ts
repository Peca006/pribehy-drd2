/// <reference types="vite-plugin-pwa/vanillajs" />

// hodnoty doplňuje Vite při sestavení (`define` ve vite.config.ts)
declare const __APP_VERSION__: string
declare const __BUILD_TIME__: string

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
