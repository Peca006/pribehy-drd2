import type { Creature } from '../content/schema'
import { repo } from '../db'

const creatures = repo<Creature>('creatures')

/** Vlastní bytosti vypravěče (vytvořené, importované nebo zkopírované z balíčku). */
export const listUserCreatures = () => creatures.list()
export const saveUserCreature = (c: Creature) => creatures.put({ ...c, source: 'user' })
export const deleteUserCreature = (id: string) => creatures.remove(id)
