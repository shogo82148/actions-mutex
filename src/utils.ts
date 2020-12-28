import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as crypto from 'crypto'

export async function mkdtemp(): Promise<string> {
  const tmp = os.tmpdir()
  return new Promise(function (resolve, reject) {
    fs.mkdtemp(`${tmp}${path.sep}actions-mutex-`, (err, dir) => {
      if (err) {
        reject(err)
        return
      }
      resolve(dir)
    })
  })
}

// return random string
export async function random(): Promise<string> {
  return new Promise(function (resolve, reject) {
    crypto.randomBytes(16, (err, buf) => {
      if (err) {
        reject(err)
      }
      resolve(buf.toString('hex'))
    })
  })
}
