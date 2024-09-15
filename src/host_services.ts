import { existsSync, linkSync, unlinkSync } from 'fs'
import icons from './icons'
import path from 'path'

export function linkSshAuthSock() {
  if (!process.env.SSH_AUTH_SOCK)
    return

  const targetPath = path.join(process.env.STAX_HOST_SERVICES, 'ssh-auth.sock')

  if (existsSync(targetPath))
    unlinkSync(targetPath)

  if (existsSync(process.env.SSH_AUTH_SOCK))
    linkSync(process.env.SSH_AUTH_SOCK, targetPath)
  else
    console.warn(`${icons.warning}  Couldn't create ${targetPath} because SSH_AUTH_SOCK (${process.env.SSH_AUTH_SOCK}) not found`)
}
