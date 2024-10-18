import { existsSync, linkSync, unlinkSync } from 'fs'
import icons from './icons'
import path from 'path'

export function linkSshAuthSock() {
  if (!process.env.SSH_AUTH_SOCK)
    return

  const targetPath = path.join(process.env.STAX_HOST_SERVICES, 'ssh-auth.sock')

  if (existsSync(targetPath))
    unlinkSync(targetPath)

  if (existsSync(process.env.SSH_AUTH_SOCK)) {
    try {
      linkSync(process.env.SSH_AUTH_SOCK, targetPath)
    } catch (e) {
      console.log(`${icons.warning}  Couldn't symlink ${process.env.SSH_AUTH_SOCK} to ${targetPath}. Is the socket still valid? - `, e.message)
    }
  } else
    console.warn(`${icons.warning}  Couldn't create ${targetPath} because SSH_AUTH_SOCK (${process.env.SSH_AUTH_SOCK}) not found`)
}
