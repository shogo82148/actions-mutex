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

export interface lockState {
  locker: string
  origin: string
  branch: string
}

class Locker {
  locker: string
  local: string
  branch: string
  origin: string

  private constructor(locker: string, local: string, branch: string, origin: string) {
    this.locker = locker
    this.local = local
    this.branch = branch
    this.origin = origin
  }

  static async create(options: lockOptions): Promise<Locker> {
    const locker = await utils.random()
    const local = await utils.mkdtemp()
    const branch = options.prefix + options.key
    let origin = options.repository
    if (/^[^/]+\/[^/]+$/.test(origin)) {
      // it looks that GitHub repository
      origin = `https://github.com/${origin}`
    }
    return new Locker(locker, local, branch, origin)
  }

  async init(token?: string): Promise<void> {
    await this.git('init', this.local)
    await this.git('config', '--local', 'core.autocrlf', 'false')
    await this.git('remote', 'add', 'origin', this.origin)

    if (token) {
      // configure authorize header
      await this.git('config', '--local', 'http.https://github.com/.extraheader', `AUTHORIZATION: basic ${token}`)
    }
  }

  async lock(token?: string): Promise<lockState> {
    await this.init(token)

    // generate files
    const data = `# Lock File for actions-mutex

    This branch contains lock file for [actions-mutex](https://github.com/shogo82148/actions-mutex).
    DO NOT TOUCH this branch manually.
    `
    await fs.writeFile(path.join(this.local, 'README.md'), data)

    const state = {
      locker: this.locker,
      origin: this.origin,
      branch: this.branch
    }
    await fs.writeFile(path.join(this.local, 'state.json'), JSON.stringify(state))

    // configure user information
    await this.git('config', '--local', 'user.name', 'github-actions[bot]')
    await this.git('config', '--local', 'user.email', '1898282+github-actions[bot]@users.noreply.github.com')

    // commit
    await this.git('add', '.')
    await this.git('commit', '-m', 'add lock files')

    // try to lock
    let sleepSec: number = 1
    for (;;) {
      const locked = await this.tryLock()
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

    await this.cleanup()
    return state
  }

  async tryLock(): Promise<boolean> {
    let stderr: string = ''
    let code = await exec.exec('git', ['push', 'origin', `HEAD:${this.branch}`], {
      cwd: this.local,
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

  async git(...args: string[]): Promise<void> {
    await exec.exec('git', args, {cwd: this.local})
  }

  async cleanup(): Promise<void> {
    io.rmRF(this.local)
  }
}

export async function lock(options: lockOptions): Promise<lockState> {
  const locker = await Locker.create(options)
  return locker.lock(options.token)
}

export async function unlock(options: lockOptions, state: lockState): Promise<void> {}
