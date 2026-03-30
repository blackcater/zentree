import os from 'os'
import path from 'path'
import Store from 'electron-store'

interface StoreSchema {
  firstLaunchDone: boolean
}

const schema = {
  firstLaunchDone: {
    type: 'boolean' as const,
    default: false,
  },
}

export const store = new Store<StoreSchema>({
  name: 'config',
  schema,
  cwd: path.join(os.homedir(), '.acme'),
})

export class AppStore {
  get firstLaunchDone(): boolean {
    return store.get('firstLaunchDone')
  }

  set firstLaunchDone(value: boolean) {
    store.set('firstLaunchDone', value)
  }
}
