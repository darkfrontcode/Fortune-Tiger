const declared = (line) => {
  const found = line.match(
    /^\s*(?:export\s+)?(?:const|let|function|class|type|interface|enum)\s+([A-Za-z_]\w*)/,
  )
  if (!found) return ''
  return found[1]
}

const checkStatePrefix = (line) => {
  const name = declared(line)
  const found = name.match(
    /^(existing|current|old|previous|next|original|updated|already|new)[A-Z]/,
  )
  if (!found) return ''
  return `${name} repete estado no nome. Uma palavra só, sem ${found[1]}.`
}

const checkBooleanPrefix = (line) => {
  const name = declared(line)
  const found = name.match(/^(is|has|can|should)[A-Z]/)
  if (!found) return ''
  return `${name} usa prefixo ${found[1]}. O nome é o estado: archived, não isArchived.`
}

const checkShortName = (line) => {
  const name = declared(line)
  const short = ['src', 'idx', 'tmp', 'err', 'doc', 'str', 'num'].includes(name)
  if (!short) return ''
  return `${name} está cortado. Use a palavra inteira: source, index, temporary, error, document, text, count.`
}

const checkBundle = (line) => {
  const name = declared(line)
  if (!/bundle/i.test(name)) return ''
  return `${name} diz que juntou coisas. O nome é o que chegou: Reading, não Bundle.`
}

const checkEntry = (line) => {
  const name = declared(line)
  if (!/entr(y|ies)/i.test(name)) return ''
  return `${name} é genérico. Par de Map é keyValue. Método nativo .entries() pode ficar.`
}

const checkMatch = (line) => {
  const name = declared(line)
  if (!/match(es|ing|ed)?/i.test(name)) return ''
  return `${name} usa match. Troque por um nome do domínio.`
}

const checkLookup = (line) => {
  const name = declared(line)
  if (!/(Catalog|ById|Lookup)/.test(name)) return ''
  return `${name} é mapa de busca. O nome termina em Context. Método é createAlgoContext.`
}

const checkSide = (line) => {
  const found = line.match(/\b((?:footer|action|button|slot)\w*(?:Left|Right|Top|Bottom))\b/)
  if (!found) return ''
  return `${found[1]} usa lado no nome. Um objeto só, com chave de significado: footers.primary.`
}

const checkDrawer = (line) => {
  const found = line.match(/^\s*(?:export\s+)?class\s+(\w*(?:Tools|Helpers?|Utils))\b/)
  if (!found) return ''
  return `${found[1]} é balaio de gato. Sem Tools/Helpers/Utils: o nome é o papel (Filter, Validator, Mapper, Formatter). Ver Peça com nome de papel em arquitetura-back.md.`
}

module.exports = {
  id: 'nomes',
  chapter: 'estilo-nomes.md',
  checks: [
    checkStatePrefix,
    checkBooleanPrefix,
    checkShortName,
    checkBundle,
    checkEntry,
    checkMatch,
    checkLookup,
    checkSide,
    checkDrawer,
  ],
}
