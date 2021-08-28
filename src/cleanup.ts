import * as core from '@actions/core'
import * as lock from './lock'

async function run() {
  try {
    const rawState = core.getState('STATE')
    if (!rawState) {
      return
    }
    const state = JSON.parse(rawState) as lock.lockState
    const required = {
      required: true
    }
    const token = core.getInput('token', required)
    const key = core.getInput('key', required)
    const repository = core.getInput('repository', required)
    const prefix = core.getInput('prefix', required)

    await lock.unlock(
      {
        token,
        key,
        repository,
        prefix
      },
      state
    )
  } catch (e) {
    if (e instanceof Error) {
      core.setFailed(e)
    } else {
      core.setFailed(`${e}`)
    }
  }
}

run()
