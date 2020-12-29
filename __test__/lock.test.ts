import {promises as fs} from 'fs'
import * as path from 'path'
import * as io from '@actions/io'
import * as exec from '@actions/exec'
import * as utils from '../src/utils'
import * as lock from '../src/lock'

describe('locking', () => {
  let remote: string // dummy remote repository
  beforeEach(async () => {
    // prepare dummy remote repository
    remote = await utils.mkdtemp()
    await exec.exec('git', ['init', '--bare', remote])
  }, 10000)

  afterEach(async () => {
    io.rmRF(remote)
  })

  it('lock', async () => {
    await lock.lock({
      repository: remote,
      key: 'lock',
      prefix: 'actions-mutex-lock/'
    })

    let output: string = ''
    await exec.exec('git', ['-C', remote, 'branch'], {
      listeners: {
        stdout: (data: Buffer) => {
          output += data.toString()
        }
      }
    })

    expect(output.trim()).toBe('actions-mutex-lock/lock')
  })

  it(
    'waits for unlocking',
    async () => {
      // prepare dummy lock
      const local = await utils.mkdtemp()
      const execOption = {
        cwd: local
      }
      await exec.exec('git', ['init', local], execOption)
      await exec.exec('git', ['config', '--local', 'core.autocrlf', 'false'], execOption)
      await exec.exec('git', ['remote', 'add', 'origin', remote], execOption)
      await fs.writeFile(path.join(local, 'state.json'), JSON.stringify({}))
      await exec.exec('git', ['add', '.'], execOption)
      await exec.exec('git', ['config', '--local', 'user.name', '[bot]'], execOption)
      await exec.exec('git', ['config', '--local', 'user.email', 'john@example.com'], execOption)
      await exec.exec('git', ['commit', '-m', 'add lock files'], execOption)
      await exec.exec('git', ['push', 'origin', 'HEAD:actions-mutex-lock/lock'], execOption)

      let locked: boolean = false
      const lockPromise = lock.lock({
        repository: remote,
        key: 'lock',
        prefix: 'actions-mutex-lock/'
      })
      lockPromise.then(() => {
        locked = true
      })

      // wait for trying to lock
      await utils.sleep(1)
      expect(locked).toBe(false)

      // unlock
      await exec.exec('git', ['push', '--delete', 'origin', 'actions-mutex-lock/lock'], execOption)
      io.rmRF(local)

      await lockPromise
      expect(locked).toBe(true)
    },
    10 * 1000
  )

  it('unlocks', async () => {
    // prepare dummy lock
    const local = await utils.mkdtemp()
    const execOption = {
      cwd: local
    }
    const state = {
      owner: 'identity-of-the-owner',
      origin: remote,
      branch: 'actions-mutex-lock/lock'
    }
    await exec.exec('git', ['init', local], execOption)
    await exec.exec('git', ['config', '--local', 'core.autocrlf', 'false'], execOption)
    await exec.exec('git', ['remote', 'add', 'origin', remote], execOption)
    await fs.writeFile(path.join(local, 'state.json'), JSON.stringify(state))
    await exec.exec('git', ['add', '.'], execOption)
    await exec.exec('git', ['config', '--local', 'user.name', '[bot]'], execOption)
    await exec.exec('git', ['config', '--local', 'user.email', 'john@example.com'], execOption)
    await exec.exec('git', ['commit', '-m', 'add lock files'], execOption)
    await exec.exec('git', ['push', 'origin', 'HEAD:actions-mutex-lock/lock'], execOption)

    await lock.unlock(
      {
        repository: remote,
        key: 'lock',
        prefix: 'actions-mutex-lock/'
      },
      {
        owner: 'identity-of-the-owner',
        origin: remote,
        branch: 'actions-mutex-lock/lock'
      }
    )

    let output: string = ''
    await exec.exec('git', ['-C', remote, 'branch'], {
      listeners: {
        stdout: (data: Buffer) => {
          output += data.toString()
        }
      }
    })

    expect(output.trim()).toBe('')
  })

  it('does not unlock the lock owned by another', async () => {
    // prepare dummy lock
    const local = await utils.mkdtemp()
    const execOption = {
      cwd: local
    }
    const state = {
      owner: 'identity-of-another-owner',
      origin: remote,
      branch: 'actions-mutex-lock/lock'
    }
    await exec.exec('git', ['init', local], execOption)
    await exec.exec('git', ['config', '--local', 'core.autocrlf', 'false'], execOption)
    await exec.exec('git', ['remote', 'add', 'origin', remote], execOption)
    await fs.writeFile(path.join(local, 'state.json'), JSON.stringify(state))
    await exec.exec('git', ['add', '.'], execOption)
    await exec.exec('git', ['config', '--local', 'user.name', '[bot]'], execOption)
    await exec.exec('git', ['config', '--local', 'user.email', 'john@example.com'], execOption)
    await exec.exec('git', ['commit', '-m', 'add lock files'], execOption)
    await exec.exec('git', ['push', 'origin', 'HEAD:actions-mutex-lock/lock'], execOption)

    await lock.unlock(
      {
        repository: remote,
        key: 'lock',
        prefix: 'actions-mutex-lock/'
      },
      {
        owner: 'identity-of-the-owner',
        origin: remote,
        branch: 'actions-mutex-lock/lock'
      }
    )

    let output: string = ''
    await exec.exec('git', ['-C', remote, 'branch'], {
      listeners: {
        stdout: (data: Buffer) => {
          output += data.toString()
        }
      }
    })

    expect(output.trim()).toBe('actions-mutex-lock/lock')
  })
})
