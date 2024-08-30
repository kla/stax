import { mkdtempSync, readFileSync, rmSync, existsSync } from 'fs'
import { execSync } from 'child_process'
import path from 'path'
import os from 'os'

const repoDirectories = new Map<string, string>()

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
  let tempDir = repoDirectories.get(repoUrl)

  if (!tempDir || !existsSync(tempDir)) {
    tempDir = mkdtempSync(path.join(os.tmpdir(), 'git-clone-'))
    repoDirectories.set(repoUrl, tempDir)
    execSync(`git clone --depth 1 ${repoUrl} ${tempDir}`)
  }

  const filePath = path.join(tempDir, file)
  return readFileSync(filePath, 'utf-8')
}

function cleanupRepoDirectories() {
  for (const dir of repoDirectories.values())
    rmSync(dir, { recursive: true, force: true })

  repoDirectories.clear()
}

process.on('exit', cleanupRepoDirectories)
