const declared = (line) => {
  const found = line.match(
    /^\s*(?:export\s+)?(?:const|let|function|class|type|interface)\s+([A-Za-z_]\w*)/,
  )
  if (!found) return ''
  return found[1]
}

const checkStringUnion = (line) => {
  if (!/type\s+\w+\s*=\s*'[^']+'\s*\|/.test(line)) return ''
  return 'União de string não entra. Conjunto fechado é enum.'
}

const TUPLE_ITEM = String.raw`(?:string|number|boolean|unknown|null|undefined|[A-Z][a-z]\w*(?:<[^>]*>)?(?:\.[A-Z][a-z]\w*)?)`
const TUPLE_TYPE = new RegExp(String.raw`:\s*\[\s*` + TUPLE_ITEM + String.raw`\s*,\s*` + TUPLE_ITEM)

const checkTuple = (line) => {
  if (!TUPLE_TYPE.test(line)) return ''
  return 'Tupla escrita na hora não entra. O tipo nasce no topo do arquivo.'
}

const checkRow = (line) => {
  const name = declared(line)
  const blocked = ['Row', 'Rows', 'Col', 'Cols', 'Column', 'Columns'].includes(name)
  if (!blocked) return ''
  return `${name} não nomeia linha nem coluna. O nome é o papel na tela.`
}

module.exports = {
  id: 'tipos',
  chapter: 'estilo-tipos.md',
  checks: [checkStringUnion, checkTuple, checkRow],
}
