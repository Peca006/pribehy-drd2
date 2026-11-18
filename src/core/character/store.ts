import { repo } from '../db'
import { characterOf, type ChangeEvent, type CharacterLog } from './model'

const logs = repo<CharacterLog>('characters')

export const listLogs = () => logs.list()
export const getLog = (id: string) => logs.get(id)
export const saveLog = (log: CharacterLog) => logs.put(log)
export const deleteLog = (id: string) => logs.remove(id)

export async function appendEvents(id: string, events: ChangeEvent[]): Promise<CharacterLog> {
  const log = (await getLog(id)) ?? { id, events: [] }
  log.events = [...log.events, ...events]
  await saveLog(log)
  return log
}

export { characterOf }
