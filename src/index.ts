import * as core from '@actions/core'
import * as lock from './lock'

async function run() {
  try {
    core.warning(
      'shogo82148/actions-mutex is no longer maintained. ' +
        'Please consider use official support for limiting concurrency. ' +
        'https://github.com/shogo82148/actions-mutex#official-concurrency-support-on-github-actions'
    )

    const required = {
      required: true
    }
    const token = core.getInput('token', required)
    const key = core.getInput('key', required)
    const repository = core.getInput('repository', required)
    const prefix = core.getInput('prefix', required)

    const state = await lock.lock({
      token,
      key,
      repository,
      prefix
    })
    core.saveState('STATE', JSON.stringify(state))
  } catch (e) {
    if (e instanceof Error) {
      core.setFailed(e)
    } else {
      core.setFailed(`${e}`)
    }
  }
}

run()
