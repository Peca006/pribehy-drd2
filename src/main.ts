import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { applyTheme } from './core/theme'
import { darkTheme, lightTheme } from './themes/default'

applyTheme(matchMedia('(prefers-color-scheme: light)').matches ? lightTheme : darkTheme)

const app = mount(App, { target: document.getElementById('app')! })
export default app
