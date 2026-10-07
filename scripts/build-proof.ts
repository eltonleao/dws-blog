import { readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { buildProof, ProofBuildError } from '../src/proof/buildProof.ts'
import type { ProofChange } from '../src/proof/types.ts'

const ROOT = process.cwd()
const TITLE = /\b(?:it|test)(?:\.\w+)*\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g

interface Mutant {
  id: string
  arquivo?: string
  procurar?: string
  trocar?: string
  trocas?: { arquivo: string; procurar: string; trocar: string }[]
}

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

function recordsFolders(argv: string[]): string[] {
  const folders: string[] = []
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--records' && argv[i + 1]) {
      folders.push(argv[i + 1])
      i += 1
    } else fail(`unknown argument: ${argv[i]}`)
  }
  if (folders.length === 0) fail('usage: node scripts/build-proof.ts --records <folder> [--records <folder>]')
  return folders
}

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) out.push(...walk(path))
    else out.push(path)
  }
  return out
}

function scanTitles(): Record<string, { test: string; file: string }> {
  const titles: Record<string, { test: string; file: string }> = {}
  const files = [
    ...walk(join(ROOT, 'src')).filter((path) => /\.test\.tsx?$/.test(path)),
    ...walk(join(ROOT, 'e2e')).filter((path) => /\.spec\.ts$/.test(path)),
  ]
  for (const path of files) {
    const file = relative(ROOT, path)
    for (const match of readFileSync(path, 'utf8').matchAll(TITLE)) {
      const id = /^([DCEM]\d+) /.exec(match[2])?.[1]
      if (!id) continue
      if (titles[id]) fail(`${id}: the test title appears in ${titles[id].file} and in ${file}`)
      titles[id] = { test: match[2], file }
    }
  }
  return titles
}

function changesOf(mutant: Mutant): ProofChange[] {
  const parts = mutant.trocas ?? [
    { arquivo: mutant.arquivo ?? '', procurar: mutant.procurar ?? '', trocar: mutant.trocar ?? '' },
  ]
  return parts
    .filter((part) => part.arquivo !== '')
    .map((part) => ({ file: part.arquivo, before: part.procurar, after: part.trocar }))
}

function readResults(path: string): Record<string, { result: string; measured: string }> {
  const results: Record<string, { result: string; measured: string }> = {}
  for (const row of readFileSync(path, 'utf8').split('\n')) {
    if (!/^\| [A-Z]+\d+ \|/.test(row) || !row.endsWith(' |')) continue
    const cells = row.slice(2, -2).split(' | ')
    results[cells[0]] = { result: cells[cells.length - 2], measured: cells[cells.length - 1] }
  }
  return results
}

function main() {
  const folders = recordsFolders(process.argv.slice(2))
  const mutants: { id: string; changes: ProofChange[] }[] = []
  const results: Record<string, { result: string; measured: string }> = {}
  const commits = new Set<string>()
  let ranAt = ''

  for (const folder of folders) {
    const definitions = JSON.parse(readFileSync(join(folder, 'mutantes.json'), 'utf8')) as Mutant[]
    for (const mutant of definitions) mutants.push({ id: mutant.id, changes: changesOf(mutant) })
    Object.assign(results, readResults(join(folder, 'mutantes.md')))
    const green = JSON.parse(readFileSync(join(folder, 'evidence/green/green.json'), 'utf8')) as {
      commit: string
      quando: string
    }
    commits.add(green.commit)
    if (green.quando > ranAt) ranAt = green.quando
  }
  if (commits.size !== 1) fail(`the records disagree on the commit: ${[...commits].join(', ')}`)

  const proof = buildProof({ commit: [...commits][0], ranAt, mutants, results, titles: scanTitles() })

  const outputs: [string, string][] = [
    [join(ROOT, 'src/proof/proof.json'), `${JSON.stringify(proof, null, 2)}\n`],
    [join(ROOT, 'src/proof/proof-count.json'), `${JSON.stringify({ total: proof.lines.length })}\n`],
  ]
  for (const [path, content] of outputs) writeFileSync(`${path}.tmp`, content)
  for (const [path] of outputs) renameSync(`${path}.tmp`, path)
  console.log(`proof: ${proof.lines.length} lines at ${proof.commit.slice(0, 7)}`)
}

try {
  main()
} catch (error) {
  if (error instanceof ProofBuildError) fail(error.message)
  throw error
}
