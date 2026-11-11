import type { Creature } from '../content/schema'
import { run } from '../db'

/** Vlastní bytosti vypravěče (vytvořené, importované nebo zkopírované z balíčku). */
export const listUserCreatures = () => run<Creature[]>('creatures', 'readonly', (s) => s.getAll())
export const saveUserCreature = (c: Creature) =>
  run('creatures', 'readwrite', (s) => s.put({ ...c, source: 'user' }))
export const deleteUserCreature = (id: string) => run('creatures', 'readwrite', (s) => s.delete(id))
