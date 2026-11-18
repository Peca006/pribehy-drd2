import { repo } from '../db'
import type { Party } from './model'

const parties = repo<Party>('parties')

export const listParties = () => parties.list()
export const getParty = (id: string) => parties.get(id)
export const saveParty = (p: Party) => parties.put({ ...p, updated: new Date().toISOString() })
export const deleteParty = (id: string) => parties.remove(id)
