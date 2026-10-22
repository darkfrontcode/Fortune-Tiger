const declared = (line) => {
  const found = line.match(
    /^\s*(?:export\s+)?(?:const|let|function)\s+([A-Za-z_]\w*)/,
  )
  if (!found) return ''
  return found[1]
}

const checkHandle = (line) => {
  const name = declared(line)
  if (!/^(handle|handler)[A-Z]/.test(name)) return ''
  return `${name} usa handle. O nome é a ação: open, remove, select.`
}

const checkResolve = (line) => {
  const name = declared(line)
  if (!/^resolve[A-Z]/.test(name)) return ''
  return `${name} usa resolve. O nome é o que a função devolve.`
}

const checkBuild = (line) => {
  const name = declared(line)
  if (!/^build[A-Z]/.test(name)) return ''
  if (line.includes('Builder')) return ''
  return `${name} usa build. Só .build() dentro de um Builder. Fora isso, o nome é o que sai.`
}

const checkWith = (line) => {
  const name = declared(line)
  if (!/^(with|without)[A-Z]/.test(name)) return ''
  return `${name} usa with ou without. Tire esse prefixo.`
}

const checkApply = (line) => {
  const found = line.match(
    /^\s*(?:(?:export|public|private|protected|static|async|const|let|function)\s+)*(apply(?:[A-Z]\w*)?)\s*[(<=:]/,
  )
  if (!found) return ''
  return `${found[1]} usa apply. A peça implementa o protocolo e o método tem o nome dele: filter, format, map.`
}

const checkAlias = (line) => {
  if (!/const\s*\{[^}]*\b\w+\s*:\s*[A-Za-z_]\w*/.test(line)) return ''
  return 'Alias no destructuring não entra. Guarde o hook inteiro e use hook.actions....'
}

module.exports = {
  id: 'actions',
  chapter: 'estilo-actions.md',
  checks: [checkHandle, checkResolve, checkBuild, checkWith, checkApply, checkAlias],
}
