import { mkdtempSync, readFileSync, rmSync } from 'fs'
import { execSync } from 'child_process'
import path from 'path'
import os from 'os'

export default function readSync(location: string, file: string): string {
  if (isGitUrl(location))
    return readFromGit(location, file)
  else
    return readFromLocalFile(location, file)
}

function isGitUrl(url: string): boolean {
  return url.startsWith('git@') || (url.startsWith('https://') && url.endsWith('.git'))
}

function readFromLocalFile(directory: string, file: string): string {
  const filePath = path.join(directory, file)
  return readFileSync(filePath, 'utf-8')
}

function readFromGit(repoUrl: string, file: string): string {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'git-clone-'))

  try {
    execSync(`git clone --depth 1 ${repoUrl} ${tempDir}`)
    const filePath = path.join(tempDir, file)
    return readFileSync(filePath, 'utf-8')
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}