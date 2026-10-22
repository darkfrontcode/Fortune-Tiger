const checkRecord = (line) => {
  if (!line.includes('Record<')) return ''
  return 'Record não é tabela. Classe que estende Map, arquivo em mappers/, leitura com .get().'
}

const checkBracket = (line) => {
  const found = line.match(/\b(\w+(?:Context|Map))\s*\[/)
  if (!found) return ''
  return `${found[1]}[chave] não entra. Leia com .get(chave).`
}

const mapperFile = (filePath) => {
  if (!filePath) return false
  return /[\\/]mappers[\\/][^\\/]*Map\.ts$/.test(filePath)
}

const checkMapperCopy = (line, filePath) => {
  if (!mapperFile(filePath)) return ''
  const checksType = /\btypeof\b/.test(line) || /Array\.isArray\(/.test(line)
  if (!checksType) return ''
  return 'Mapper só copia o campo. Sem checagem de tipo, de vazio, de array ou de null. O valor passa direto, como o campo vizinho.'
}

module.exports = {
  id: 'mapas',
  chapter: 'arquitetura-back-dados.md',
  checks: [checkRecord, checkBracket, checkMapperCopy],
}
