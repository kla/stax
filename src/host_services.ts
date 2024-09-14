import { existsSync, linkSync, unlinkSync } from 'fs'
import path from 'path'

export function linkSshAuthSock() {
  if (!process.env.SSH_AUTH_SOCK)
    return

  const targetPath = path.join(process.env.STAX_HOST_SERVICES, 'ssh-auth.sock')

  if (existsSync(targetPath)) unlinkSync(targetPath)
  linkSync(process.env.SSH_AUTH_SOCK, targetPath)
}
