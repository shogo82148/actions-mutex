import * as io from '@actions/io'
import * as exec from '@actions/exec'
import * as utils from '../src/utils'
import * as lock from '../src/lock'

describe('locking', () => {
  let remote: string // dummy remote repository
  beforeAll(async () => {
    // prepare dummy remote repository
    remote = await utils.mkdtemp()
    await exec.exec('git', ['init', '--bare', remote])
  }, 10000)

  afterAll(async () => {
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
})
