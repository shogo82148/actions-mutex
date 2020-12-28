import * as exec from '@actions/exec'
import * as io from '@actions/io'
import * as utils from './utils'

export interface lockOptions {
  token?: string
  key: string
  repository: string
  prefix: string
}

export interface lockResult {
  locker: string
  origin: string
  branch: string
}

export async function lock(options: lockOptions): Promise<lockResult> {
  const locker = await utils.random()
  const branch = options.prefix + options.key
  const local = await utils.mkdtemp()
  let origin = options.repository
  if (/^[^/]+\/[^/]+$/.test(origin)) {
    // it looks that GitHub repository
    origin = `https://github.com/${origin}`
  }

  await exec.exec('git', ['init', local])
  await exec.exec('git', ['-C', local, 'remote', 'add', 'origin', origin])

  if (options.token) {
    // configure authorize header
    await exec.exec('git', [
      '-C',
      local,
      'config',
      '--local',
      'http.https://github.com/.extraheader',
      `AUTHORIZATION: basic ${options.token}`
    ])
  }

  await exec.exec('git', ['-C', local, 'switch', '-c', branch])

  console.log(locker)

  // cleanup
  io.rmRF(local)

  return {
    locker,
    origin,
    branch
  }
}

export async function unlock(): Promise<void> {}
