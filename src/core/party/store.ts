import { run } from '../db'
import type { Party } from './model'

export const listParties = () => run<Party[]>('parties', 'readonly', (s) => s.getAll())
export const getParty = (id: string) =>
  run<Party | undefined>('parties', 'readonly', (s) => s.get(id))
export const saveParty = (p: Party) =>
  run('parties', 'readwrite', (s) => s.put({ ...p, updated: new Date().toISOString() }))
export const deleteParty = (id: string) => run('parties', 'readwrite', (s) => s.delete(id))
