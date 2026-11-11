import { run } from '../db'
import { characterOf, type ChangeEvent, type CharacterLog } from './model'

export const listLogs = () => run<CharacterLog[]>('characters', 'readonly', (s) => s.getAll())
export const getLog = (id: string) =>
  run<CharacterLog | undefined>('characters', 'readonly', (s) => s.get(id))
export const saveLog = (log: CharacterLog) => run('characters', 'readwrite', (s) => s.put(log))
export const deleteLog = (id: string) => run('characters', 'readwrite', (s) => s.delete(id))

export async function appendEvents(id: string, events: ChangeEvent[]): Promise<CharacterLog> {
  const log = (await getLog(id)) ?? { id, events: [] }
  log.events = [...log.events, ...events]
  await saveLog(log)
  return log
}

export { characterOf }
