import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()
const CONFIG_PATH = path.join(ROOT, '.quality', 'code-size-baseline.json')
const SOURCE_ROOTS = ['backend/app', 'frontend/src']
const SOURCE_EXTENSIONS = new Set(['.php', '.js', '.mjs', '.vue', '.css'])

const normalizePath = filePath => path.relative(ROOT, filePath).split(path.sep).join('/')

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...await collectSourceFiles(entryPath))
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(entryPath)
    }
  }

  return files
}

function countLines(content) {
  return content.length === 0 ? 0 : content.split(/\r\n|\r|\n/u).length
}

const config = JSON.parse(await readFile(CONFIG_PATH, 'utf8'))
const files = (await Promise.all(
  SOURCE_ROOTS.map(sourceRoot => collectSourceFiles(path.join(ROOT, sourceRoot))),
)).flat()
const failures = []
const reductions = []

for (const file of files) {
  const relativePath = normalizePath(file)
  const lines = countLines(await readFile(file, 'utf8'))
  const allowedLines = config.existingOversizedFiles[relativePath] ?? config.maxLines

  if (lines > allowedLines) {
    failures.push(`${relativePath}: ${lines} lines (allowed ${allowedLines})`)
  } else if (config.existingOversizedFiles[relativePath] && lines < allowedLines) {
    reductions.push(`${relativePath}: ${allowedLines} -> ${lines}`)
  }
}

if (failures.length > 0) {
  console.error('Code-size gate failed. Split the growing file into focused modules:')
  failures.forEach(failure => console.error(`- ${failure}`))
  process.exitCode = 1
} else {
  console.log(`Code-size gate passed (${files.length} source files checked).`)
}

if (reductions.length > 0) {
  console.log('Oversized files reduced; lower their saved baselines in the next cleanup:')
  reductions.forEach(reduction => console.log(`- ${reduction}`))
}
