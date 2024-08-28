import fs from 'fs/promises'
import path from 'path'
import { simpleGit } from 'simple-git'
import os from 'os'

export default async function read(location: string, file: string): Promise<string> {
  if (isGitUrl(location)) {
    return readFromGit(location, file)
  } else {
    return readFromLocalFile(location, file)
  }
}

function isGitUrl(url: string): boolean {
  return url.startsWith('git@') || url.startsWith('https://') && url.endsWith('.git')
}

async function readFromLocalFile(directory: string, file: string): Promise<string> {
  const filePath = path.join(directory, file)
  return fs.readFile(filePath, 'utf-8')
}

async function readFromGit(repoUrl: string, file: string): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-clone-'))
  const git = simpleGit()

  try {
    await git.clone(repoUrl, tempDir)
    const filePath = path.join(tempDir, file)
    return fs.readFile(filePath, 'utf-8')
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
}