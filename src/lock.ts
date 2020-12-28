import * as exec from '@actions/exec'
import * as io from '@actions/io'
import * as fs from 'fs/promises'
import * as path from 'path'
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

  const data = `# Lock File for actions-mutex

This branch contains lock file for [actions-mutex](https://github.com/shogo82148/actions-mutex).
DO NOT TOUCH this branch manually.
`
  await fs.writeFile(path.join(local, 'README.md'), data)

  const state = {
    locker,
    origin,
    branch
  }
  await fs.writeFile(path.join(local, 'state.json'), JSON.stringify(state))

  await exec.exec('git', ['-C', local, 'add', '.'])

  // configure user information
  await exec.exec('git', ['-C', local, 'config', '--local', 'user.name', 'github-actions[bot]'])
  await exec.exec('git', [
    '-C',
    local,
    'config',
    '--local',
    'user.email',
    '1898282+github-actions[bot]@users.noreply.github.com'
  ])

  await exec.exec('git', ['-C', local, 'commit', '-m', 'add lock files'])
  await exec.exec('git', ['-C', local, 'push', 'origin', `HEAD:${branch}`])

  // cleanup
  io.rmRF(local)

  return state
}

export async function unlock(): Promise<void> {}
