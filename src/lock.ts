import * as exec from '@actions/exec'
import * as io from '@actions/io'
import {promises as fs} from 'fs'
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
  const execOption = {
    cwd: local
  }

  await exec.exec('git', ['init', local], execOption)
  await exec.exec('git', ['config', '--local', 'core.autocrlf', 'false'], execOption)
  await exec.exec('git', ['remote', 'add', 'origin', origin], execOption)

  if (options.token) {
    // configure authorize header
    await exec.exec(
      'git',
      ['config', '--local', 'http.https://github.com/.extraheader', `AUTHORIZATION: basic ${options.token}`],
      execOption
    )
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

  // configure user information
  await exec.exec('git', ['config', '--local', 'user.name', 'github-actions[bot]'], execOption)
  await exec.exec(
    'git',
    ['config', '--local', 'user.email', '1898282+github-actions[bot]@users.noreply.github.com'],
    execOption
  )

  // commit
  await exec.exec('git', ['add', '.'], execOption)
  await exec.exec('git', ['commit', '-m', 'add lock files'], execOption)

  let sleepSec: number = 1
  for (;;) {
    const locked = await tryLock(local, branch)
    if (locked) {
      break
    }
    await utils.sleep(sleepSec + Math.random())

    // exponential back off
    sleepSec *= 2
    if (sleepSec > 30) {
      sleepSec = 30
    }
  }

  // cleanup
  io.rmRF(local)

  return state
}

async function tryLock(local: string, branch: string): Promise<boolean> {
  let stderr: string = ''
  let code = await exec.exec('git', ['push', 'origin', `HEAD:${branch}`], {
    cwd: local,
    ignoreReturnCode: true,
    listeners: {
      stderr: data => {
        stderr += data.toString()
      }
    }
  })
  if (code == 0) {
    return true
  }
  if (stderr.includes('[rejected]')) {
    return false
  }
  throw new Error('failed to git push: ' + code)
}

export async function unlock(options: lockOptions, state: lockResult): Promise<void> {}
