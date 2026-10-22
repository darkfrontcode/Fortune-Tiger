const fileSystem = require('fs')
const os = require('os')
const nodePath = require('path')

const phases = require('./phases')

const chapterRoot = nodePath.join(os.homedir(), '.claude', 'skills', 'formatos-de-codigo')
const limit = 12

const strip = (line) => {
  const trimmed = line.trim()
  const comment = trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')
  if (comment) return ''
  const [code] = line.split('//')
  return code
}

const scanFile = (filePath, phase) => {
  const text = fileSystem.readFileSync(filePath, 'utf8')
  const lines = text.split('\n')

  return lines.flatMap((line, index) => {
    const code = strip(line)
    if (!code) return []

    return phase.checks.flatMap((check) => {
      const hint = check(code, filePath)
      if (!hint) return []
      return [{ file: filePath, line: index + 1, hint }]
    })
  })
}

const safeScan = (filePath, phase) => {
  try {
    return scanFile(filePath, phase)
  } catch {
    return []
  }
}

const firstPhase = (files) => {
  const found = phases
    .map((phase) => ({
      phase,
      findings: files.flatMap((filePath) => safeScan(filePath, phase)),
    }))
    .find((item) => item.findings.length > 0)

  if (!found) return { phase: null, findings: [] }
  return found
}

const message = (phase, findings, order) => {
  const chapter = nodePath.join(chapterRoot, phase.chapter)
  const shown = findings.slice(0, limit)
  const lines = shown.map((item) => `- ${item.file}:${item.line} — ${item.hint}`)
  const hidden = findings.length - shown.length
  const more = hidden > 0 ? `\nTem mais ${hidden}. Arrume estas primeiro.` : ''

  return [
    `Fase ${order} de ${phases.length}: ${phase.id}.`,
    'A skill manda. O arquivo do projeto não é exemplo.',
    `Abra só este capítulo: ${chapter}`,
    'Corrija só estas linhas. Não reescreva o arquivo. Não arrume outra fase.',
    lines.join('\n'),
    more,
  ].join('\n')
}

const signatureOf = (findings) => findings.map((item) => `${item.file}:${item.line}:${item.hint}`).join('|')

module.exports = { firstPhase, message, signatureOf, phases }
