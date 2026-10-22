const checkLoop = (line) => {
  if (!/\bfor\s*(?:\(|of\b|in\b|await\b)/.test(line)) return ''
  return 'for não entra. Lista usa map, filter, reduce ou find. Espera em sequência usa reduce.'
}

const checkLet = (line) => {
  if (!/\blet\s+/.test(line)) return ''
  return 'let não entra. Uma const por passo, ou return cedo.'
}

const checkBang = (line) => {
  if (!line.includes('!!')) return ''
  return '!! não entra. Comparação explícita ou Boolean(...).'
}

const checkFragment = (line) => {
  if (!/<>|<\/>/.test(line)) return ''
  return '<> não entra. Fragment importado de react.'
}

const checkSetter = (line) => {
  const found = line.match(/\[\s*\w+\s*,\s*(set[A-Z]\w*)/)
  if (!found) return ''
  return `${found[1]} é setter de useState. O nome é change. Se brigar com outro change, o setter vira o verbo do substantivo.`
}

const checkClassName = (line) => {
  if (!/\bclassName\s*=/.test(line)) return ''
  return 'className não entra em JSX novo. Styled component com o nome do papel.'
}

const checkCalc = (line) => {
  if (!/\bcalc\s*\(/.test(line)) return ''
  return 'calc() não entra no CSS.'
}

const checkComment = (line) => {
  const trimmed = line.trim()
  const comment = trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')
  if (!comment) return ''
  return 'Comentário não entra. Só numa lib esquisita ou num truque que não dá para ver lendo o código.'
}

module.exports = {
  id: 'escrita',
  chapter: 'estilo-escrita.md',
  checks: [checkLoop, checkLet, checkBang, checkFragment, checkSetter, checkClassName, checkCalc, checkComment],
}
