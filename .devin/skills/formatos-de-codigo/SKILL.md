---
name: formatos-de-codigo
description: >-
  Padrão de código do dono para TypeScript e JavaScript (nomes, const,
  callbacks, JSX, CSS, actions) e arquitetura HR Tech no front e no back.
  Use antes de escrever, revisar ou refatorar qualquer código. Leia sempre
  este índice, a persona e o desenho. Responda o Portão de desenho antes da
  primeira linha. Depois abra só o arquivo do assunto. Quando o usuário
  pedir uma regra nova nesta skill, siga **Como crescer** e reavalie os
  ganchos antes de terminar, mesmo que ele não fale de gancho.
---

# Formatos de código

Índice da skill. As regras curtas estão aqui. A forma completa da peça está em [desenho.md](desenho.md). O detalhe fica nos arquivos linkados.

## Portão de desenho (antes da primeira linha)

Código novo, fix ou feature, front ou back: antes de qualquer código, responda no chat em sete linhas, uma por pergunta, na ordem da tabela. Cada linha é uma frase curta, só com a decisão desta tarefa. Sem item extra, sem citar regra, sem justificar: nada de `então`, `porque`, `pois`. A terceira coluna é a regra para decidir, não o texto da linha: não copie. Sem as sete linhas, não escreva. Mudança só de CSS, texto da tela ou tradução: pule o Portão.

Logo depois da linha 7 vem a pergunta ao dono, se houver. Vira pergunta:

- efeito colateral;
- mudança no payload ou no banco que o pedido não trouxe;
- efeito que sobra de regra que não entrou (linha 2);
- caso em que o bug do pedido continua depois do fix;
- fix que precisa de mais do que a linha 1 deixa no arquivo velho;
- domínio novo no front (abaixo);
- dúvida que o código não responde.

Dúvida de fato (o dado já chega? o campo é opcional?) você confere no código: não pergunte. Cada pergunta é uma frase, numa linha própria, com o efeito ou a dúvida, terminada em `?`. Sem `porque` e sem o que você conferiu (exemplos abaixo da tabela). Com pergunta aberta, a resposta acaba nela: sem código, nem assumindo que sim, mesmo que o pedido mande escrever o código. Pergunta nunca vira aviso no fim da resposta.

| # | Pergunta | Regra (não copie) |
| --- | --- | --- |
| 1 | Mexe em arquivo que já funciona (fix ou feature)? | Sim, com regra nova: a regra vai numa classe nova. No arquivo velho entram só a propriedade, um método novo e uma linha que chama esse método: trocada, ou nova numa validação. Sim, sem regra (campo, JSX, ação nova, linha no barrel): soma as linhas e não reescreve as velhas. Não, só arquivo novo: a skill inteira. |
| 2 | O que a peça faz? Um verbo. | O verbo dá o papel, a classe e a pasta (tabela em [desenho.md](desenho.md)). Uma regra por peça. Dois verbos ou duas regras: duas classes. Regra que o pedido não trouxe (sumir grupo vazio, ordenar, tirar repetido, juntar espaço repetido, tirar espaço da borda) não entra. Não entrar não decide o efeito que sobra, na tela, no arquivo ou na API: ele é pergunta (acima). Nunca gaveta (lista no [desenho.md](desenho.md)). Sem regra nova: `sem peça`, aqui e nas linhas 3 e 4. |
| 3 | Qual protocolo? | O do papel. Existe: implemente. Não existe: crie no formato dos irmãos e exporte no `index.ts`. O método tem o nome do protocolo. |
| 4 | Qual `Input` e `Output`? | `type Input` e `type Output` no topo. Sem campo opcional, sem `undefined`, salvo o default da `*ParamsFactory`. O opcional fica em quem chama, e só se o tipo é opcional. Peça em fila depois de outra: o `Input` é o `Output` da anterior. |
| 5 | Quem usa e onde guarda? | Classe: `private readonly <papel> = new <Peca>()`. Hook, dono `static` ou arquivo Zod: `const` no topo do arquivo. A peça não tem `static`. |
| 6 | Qual linha antiga muda? | Uma só: a que passa a chamar o método novo. Validação que só confere e lança: nenhuma muda. Entra uma linha nova com a chamada, logo antes da linha que usa o dado. Nenhuma assinatura muda. O `execute` não ganha passo. Feature sem regra: só as linhas que somam. Cite só a expressão que muda. Expressão com crase: cite a parte sem crase, ou descreva. |
| 7 | Onde fica a spec? | `<Peca>.spec.ts` ao lado da peça. Use case, provider, service ou hook velho mudou: um `it` novo, só com `const`, na spec que já roda esse fluxo (provider sem spec própria: a do use case que chama ele). Sem peça: só esse `it`, se a spec existir. Escreva, não rode. |

Exemplo, o fix do [desenho.md](desenho.md):

```text
1. Sim, com regra: a propriedade, um método novo e a troca de uma linha no provider.
2. Tira o valor do anexo: `AttachmentFieldFilter` em `exportations/filters/`.
3. `FilterProtocol` com `filter`, de `shared/protocols/`, que já existe.
4. `Input` com `fields`, `systemFieldId` e `value`, e `Output` é `string`.
5. O provider guarda `private readonly filter = new AttachmentFieldFilter()`.
6. `formatFileText(field?.personFieldValue || '')` vira `this.formatPersonField(person, fileColumn, field)`.
7. `AttachmentFieldFilter.spec.ts` ao lado da peça e um `it` novo no `ExportPayrollUseCase.spec.ts`, sem rodar.
Campo de anexo apagado depois que a folha fechou ainda dá 500 nessa coluna: cubro esse caso ou fica assim?
```

No front, a linha 3 com protocolo novo e a pergunta de payload:

```text
3. `IFilter` com `filter`, novo em `src/protocols/filter.ts` no formato do `IMapper` e exportado no `index.ts`.
Pode um modelo salvo com anexo marcado perder o anexo no `systemFieldsIds` ao salvar de novo?
```

Domínio novo no front: antes da primeira pasta, pergunte ao dono se vai na estrutura de [arquitetura-front.md](arquitetura-front.md) ou no `src/domains/` do AGENTS.md.

## Fonte da verdade

A skill manda. O projeto não manda.

A skill é soberana. O projeto é legado, bagunçado, e não serve de referência para nada. Na dúvida entre a skill e o projeto, a skill vence. Sempre.

Ordem, sempre esta, nunca o contrário:

1. Leia a skill: este índice, a persona, o desenho, o arquivo do assunto.
2. Leia o projeto, no branch certo (abaixo), só para saber o que existe: o model, o protocolo, a linha velha. A forma vem só da skill. Se o projeto discordar da skill, ignore o projeto.
3. Responda o **Portão de desenho**.
4. Escreva no jeito da skill.
5. Antes de dizer que terminou, rode o scan do gancho (`~/.claude/skills/formatos-pipeline/SKILL.md`) nos arquivos que você criou, nas linhas que você escreveu no arquivo velho e no código que só está na resposta. Voltou fase: siga o pipeline.
6. Depois confira **Pronto é**. O fim dele diz o que a resposta traz.

O código que já está no projeto não é exemplo. Não copie o arquivo vizinho.

O branch certo é o aberto, quando ele é do próprio card. Branch aberto de outro card: pergunte ao dono antes de escrever. Sem branch do card, feature e fix saem da `staging`, e hotfix sai da `main`: leia lá, depois de `git fetch`, com `git show origin/<branch>:<arquivo>`. Par fix e hotfix do mesmo card: o mesmo desenho, e cada branch com os nomes que ele tem.

O AGENTS.md ou o CLAUDE.md do projeto manda seguir o padrão do arquivo legado? Isso só quer dizer: não mexa no que já existe. O código novo segue a skill. Prettier, lint e teste: grupo **Escrita**, abaixo.

## Como ler

1. Leia **este arquivo inteiro**. Ele é curto de propósito.
2. Abra **sempre** [persona.md](persona.md) e [desenho.md](desenho.md). Os dois são curtos.
3. Abra os outros arquivos da tabela que batem com a tarefa. Um ou dois bastam quase sempre.
4. Não abra os outros. Leia a skill e o pipeline só por `~/.claude/skills/`. Cópia em `~/.cursor` ou em backup é velha: não leia.
5. Quando uma regra disser "ver **nome da seção**", o exemplo está no arquivo da tabela cujo assunto combina com esse nome. Abra esse arquivo se for aplicar a regra de verdade.

## Índice

| Quando a tarefa mexe nisso | Abra | O que tem lá |
| --- | --- | --- |
| Sempre, antes de olhar o projeto | [persona.md](persona.md) | quem é o dono, carreira rumo a back, SOLID, Gang of Four, Open/Closed |
| Sempre, antes de escrever | [desenho.md](desenho.md) | papel, protocolo, verbo genérico, gaveta, sem `static`, quem usa, Validator, fix ou feature com peça nova, spec, formas recusadas |
| Sempre, depois de escrever | `~/.claude/skills/formatos-pipeline/SKILL.md` | rode o scan nos arquivos criados e nas linhas que você escreveu nos arquivos velhos |
| Fix ou feature em código que já funciona (front ou back) | [desenho.md](desenho.md) e o arquivo do assunto | onde nasce a peça nova, o que pode mudar no arquivo velho |
| Qualquer código TypeScript ou JavaScript (jeito de escrever) | [estilo-escrita.md](estilo-escrita.md) | `const`, setter `change`, callbacks, input em objeto, opcional em quem chama, JSX, `Fragment`, arrays, `if` de uma linha, `.sort()`, sem comentário |
| Nome de variável, constante, Map, método ou propriedade de peça | [estilo-nomes.md](estilo-nomes.md) | uma palavra, sem prefixo de estado, sufixo `Context`, sem `Entry`, sem `left`/`right` |
| `types.ts`, namespace, props, boolean, tipagem | [estilo-tipos.md](estilo-tipos.md) | tipos antes de `const`, `Input`/`Output` de peça, namespace `Type`, ordem dos tipos, sem `is`/`has`, sem `match`, sem `!!`, sem `Row`/`Col` |
| Visual (CSS, styled, grid, theme) e literais | [estilo-visual.md](estilo-visual.md) | nome do styled pelo papel, estado visual, `theme.ts`, nunca `calc()`, grid, texto ou número solto e as suas exceções, `EMPTY_*`, `.trim()`, encadeamento, constructor |
| Retorno de hook, `actions`, alias, nome de função | [estilo-actions.md](estilo-actions.md) | sem alias, shorthand e as suas exceções, `actions` inline, agrupar só o que é igual, sem `handle` / `resolve` / `build` / `with` |
| Módulo novo ou pasta no front HR Tech | [arquitetura-front.md](arquitetura-front.md) | pastas, protocolos do front, DTO, enum, request, mapper, filter, strategies (Context de instância), mapa local no hook |
| Hook de tela ou hook de request no front | [arquitetura-front-hooks.md](arquitetura-front-hooks.md) | `useTranslations`, ordem dos hooks, peça de papel dentro de hook, handlers, request |
| Módulo, tipo, classe nova, formatter ou factory no back HR Tech | [arquitetura-back.md](arquitetura-back.md) | pastas, tipos de domínio, ParamsFactory, formatter com `FormatterProtocol` |
| Use case, service, provider, guard ou repositório no back | [arquitetura-back-casos.md](arquitetura-back-casos.md) | `Input`/`Output`, transaction, `IRequest`, `assert`, `tenantId`, `context` primeiro |
| Zod, mapper Prisma, Map, erro, mutação, builder ou teste no back | [arquitetura-back-dados.md](arquitetura-back-dados.md) | validator, `Raw`, classe `Map`, `messages.ts`, verbos, builder, spec, teste isolado |

Fora do HR Tech, ignore os arquivos de arquitetura front e back. No front, some estilo + arquitetura front. No back, some estilo + arquitetura back. O desenho vale nos dois.

Strategy vale no front e no back. A seção **Strategies (regra de decisão)** está em [arquitetura-front.md](arquitetura-front.md). Abra ela mesmo numa tarefa de back.

Cada linha abaixo é a regra. O exemplo mora no arquivo do índice. Abra esse arquivo antes de escrever.

### Desenho — [desenho.md](desenho.md)

- Fix ou feature em código que já funciona: a regra nova mora numa classe nova. No arquivo velho: a propriedade `private readonly`, um método novo que monta o `input` e chama a peça, e a troca de uma linha. Validação que só lança: nada é trocado. Entra uma linha nova `this.assert<Regra>(...)` antes da linha que usa o dado, e o `assert*` devolve `void`. Feature sem regra (campo, JSX, ação nova) só soma linhas.
- Sem trocar assinatura, sem passo novo no `execute`, sem tocar o vizinho. Precisa de mais? É pergunta do Portão.
- Nunca gaveta (`tools/`, `helpers/`, `utils/`, `*Tools`, `*Helper(s)`, `*Utils` e outras). Lista inteira no desenho. Front e back.
- A classe tem o nome do papel, mora na pasta do papel, implementa o protocolo do papel e tem um método público, com o nome do protocolo. Uma regra por peça, a do pedido.
- Verbo genérico (`apply`, `run`, `process`, `get`…) não entra em nome nenhum: método, função, callback, chave de `actions`. Nem como prefixo. A lista e as exceções estão no desenho, em **Verbo genérico**.
- Sem `static`. Exceções, só estas: API do `*Map` de Prisma/DTO e `static create` da entidade. Sem constructor com dados, sem `private constructor`, sem `from`. Dependência no `constructor` do `*Service` pode.
- `Input` / `Output` no topo. Dentro da peça: sem campo opcional, sem `?.`, sem `??`. O opcional fica no método novo de quem usa, e só se o tipo do campo é opcional. Exceção: o default da `*ParamsFactory` (desenho, **A peça**).
- Quem usa guarda a instância: `private readonly` na classe; `const` no topo do arquivo no hook, no dono `static` e no arquivo Zod.
- `*Map` não é `*Mapper`. `*Mapper` é peça de papel com `map` de instância.
- `*Validator` devolve `ValidationResult.ok` ou `failure` e é dono da mensagem. O `assert*` de quem usa lança a mensagem que veio.
- Peça nova nasce com spec ao lado. Escreva, não rode.

### Escrita — [estilo-escrita.md](estilo-escrita.md)

- Sem comentário. Sem `//` e sem bloco. Exceção rara: lib esquisita ou truque invisível.
- Sempre `const`. Sem `let`, nunca. Linha nova não reatribui um `let` que já existe (linha velha trocada: desenho, **Fix ou feature em código que já funciona**). Uma const por passo, ou return cedo.
- Chamada não entra dentro de outra chamada. O resultado vira `const`.
- Objeto de entrada: cada campo em `const`, depois `const input = { ... }` só com shorthand.
- Escolher valor: `const` booleana com nome de estado e `if` de uma linha com return cedo. Regra nova não entra num ternário da linha velha.
- Sem `for`, `for...of`, `for...in`. Lista: `map`, `filter`, `reduce`, `find`. Espera em sequência: `reduce`.
- `if` de uma linha: `if (condição) { instrução }` na mesma linha.
- `<>` não entra. `Fragment` importado de `react`.
- Sem `!!`. Comparação ou `Boolean(...)`.
- String solta vira `const` no topo, também na spec. As exceções estão em **Strings literais: nunca soltas no código** (estilo-visual).
- Número solto em comparação vira `const` no topo. Zero é `EMPTY_NUMBER` (front: `helpers`, só importar; back: `shared/constants`). Na `main` do back o nome ainda é `EMPTY_NUNBER`: use o do branch da tarefa (**Emptiness**). Não crie outro zero e não fuja da comparação. No CSS, fica inline.
- Callback de `map` / `filter` / `sort` / `reduce` / `find` / `some` nomeado, salvo JSX trivial. Predicado (`by*`): uma linha e uma condição. Transformação (`to*`) pode ter uma `const` por passo, como `toLane`. Objeto montado no callback sai só com shorthand: campo calculado vira `const` antes, num corpo em bloco. Ao revisar código velho, o mesmo.
- O mesmo predicado não roda duas vezes na lista (`some` e depois `filter`). Filtre uma vez e confira o tamanho.
- `.sort()` com data opcional: `backward` / `forward` com corpo em bloco.
- Não extrair JSX para `const` só para repetir entre branches.
- Sem função solta. No front, regra pura é peça de papel e estado é hook. No back é classe. Callback de lista fica dentro do método. Exceções, só estas: request de API (`*Request`), resolver de styled em `theme.ts` / `styles.ts`, predicado, callback e schema no topo do arquivo Zod, mensagem dinâmica em `data/messages.ts`.
- `Promise.all` só se os pedidos não dependem um do outro e não repetem a mesma busca no banco. Cada promise é `const` antes do `await`. Vários ids: `readMany`.
- Setter de `useState` se chama `change`. Um estado confuso: `value` / `change`. Dois ou mais: nome de domínio. Se brigar com outro `change`, o setter vira o verbo (`answers` → `reply`).
- Não rode Prettier, lint nem teste sozinho, mesmo que o projeto peça. Só quando o usuário pedir, ou antes do commit. Pedido para consertar teste ou CI conta como pedido. O scan do pipeline roda sempre.

### Nomes — [estilo-nomes.md](estilo-nomes.md)

- Inglês, palavra inteira, de preferência uma. Sem abreviação (`source`, não `src`).
- String com significado não fica solta: vira `const` no topo, uma palavra (`encoding = 'base64url'`, `relation = 'wallet'`, `platform = 'fortune-tiger'`). A mesma string em duas linhas é uma constante só. Valor que a lib já nomeia usa a constante dela (`QueryOrder.ASC`). Fica inline só o lado direito de `typeof`, a chave de objeto e o texto que um decorator recebe.
- Sem prefixo de estado ou relativo: `existing`, `current`, `new`, `old`, `previous`, `next`, `original`, `updated`, `already`, `other`. Exceção: `prev` / `next` como parâmetros do comparador de `.sort()`.
- Constantes irmãs viram um objeto, menos instância de peça (desenho, **Quem usa a peça**). Sem `footerLeft` / `footerRight`. Chave com significado: `footers.primary`. Vale na spec (`IDS.attachment`, `IDS.text`) e em callback (`byFilled.group`).
- Mapa montado na hora, a partir de lista: sufixo `Context`. Sem `Catalog`, `ById`, `lookup`.
- Sem `bundle`. Sem `Entry` / `entries` no nome. `.entries()` nativo pode.
- Predicado de `filter` / `find` / `some` / `every` é `by*`. Transformação de `map` / `reduce` é `to*`.
- Propriedade da peça com o nome do papel (`filter`), resultado no particípio (`filtered`). Resultado que entra direto como chave do objeto montado logo depois leva o nome da chave (`systemFields`).

### Tipos — [estilo-tipos.md](estilo-tipos.md)

- Tipos antes de `const`.
- Peça de papel: `type Input` / `type Output` no topo, sem `export`, sem namespace, sem campo opcional (salvo o default da `*ParamsFactory`).
- Na peça e na spec, todo tipo entra com `import type`: protocolo, interface, DTO. Enum usado como valor fica em `import`.
- Tupla escrita na hora (`[string, ExportLayout]`) não entra. O tipo nasce no topo do arquivo.
- Namespace em `types.ts` do dono, sufixo `Type`, um por hook ou componente. Não juntar vários donos na raiz.
- No arquivo que usa: atalho no topo (`type Answer = ExtraFieldsType.Answer`).
- Composição do retorno de hook (`Actions`, `Getters`, `Events`) não leva o nome do hook. Só a saída leva: `{Hook}Output` (no namespace, só `Output`). Sem `types.ts`: composições e `{Hook}Output` são `interface`. Com `types.ts`: tudo `export type` no namespace.
- Boolean sem `is` / `has` / `can` / `should`. O nome é o estado: `archived`.
- Sem `match` / `matches` / `matching` / `matched` no nome.
- Sem `typeof valor === 'string' ? valor : undefined`. Sem `as` só para calar o tipo.
- Sem nome `Row` / `Col` / `Column` na tela (componente, styled, prop, tipo de UI). Coluna de arquivo exportado (CSV) é domínio: `column` pode.
- Conjunto fechado de texto é enum. Sem união de string (`'show' | 'hide'`).

### Visual — [estilo-visual.md](estilo-visual.md)

- Visual novo é styled com o nome do papel (`Tabs`, `Line`). Sem `className`. Sem `CategoryTabs`.
- Projeto com classe utilitária (Tailwind, `clsx`): a composição sai da tag e vira `const` com o nome do papel antes do `return`. Condição repetida vira uma `const` booleana; classes que andam juntas viram uma constante.
- Sem `calc()`.
- CSS Grid: `grid-template-areas` + objeto `Areas`.
- Sem `.trim()` por hábito.
- Duas ou mais chamadas encadeadas: uma por linha.
- Constructor com um parâmetro: uma linha. Peça de papel não recebe dados no `constructor` (desenho, **A peça**).
- Não renomear o que já existe sem necessidade forte.

### Actions — [estilo-actions.md](estilo-actions.md)

- Sem alias (`{ actions: outroNome }`), nem em import. Guarde o hook e use `hook.actions`. Exceção única: model Prisma no `*Map` (`<Entity> as Prisma<Entity>`).
- Return e objeto de entrada só com shorthand: hook, classe, peça ou callback. Monte as props antes. As exceções (`*Map`, Prisma, Zod, styled) estão em **Retorno de objetos: só shorthand**.
- `actions`: handler escrito na propriedade. Sem `const` separada. Sem repassar referência direta.
- `change` não entra em `actions`. `actions` é clique, salvo o `actions.get` do hook de labels.
- Objeto só junta a mesma coisa. Coisa diferente é irmã (`file.create`, não dentro de `change`).
- Verbos da mesma ação viram um objeto (`toggle.open`, `toggle.visibility`). O tipo usa a interface: `toggle: Toggle`. Sem método solto `toggleBubbleVisibility`.
- Sem `handle` / `handler`, `resolve`, `build`, `with` / `without` no nome. Verbo genérico: grupo **Desenho**.
- Componente e story: `onClick={actions.open}`.
- Sem hook que só repassa props.
- Sem `useEffect` olhando valor para disparar pedido. Pedido nasce de clique, change, ou abertura da tela.
- `onClick` / `onChange` vêm de `actions`.
- `useTranslations`: um hook local por componente ou hook que usa i18n.

### Front — [arquitetura-front.md](arquitetura-front.md) e [arquitetura-front-hooks.md](arquitetura-front-hooks.md)

- Componente em `<Pasta>/<Pasta>.tsx`. `index.ts` só exporta. `styles.ts` e `types.ts` só quando precisar.
- Evento no JSX não é função escrita na tag. Um callback: `const` no componente. A partir de dois: hook com `actions`.
- Regra pura (tira, confere, converte, monta texto) não mora no hook. É peça de papel; o hook só chama.
- Strategy: uma classe por variante, com `readonly source`. O Context é instância, implementa o mesmo protocolo, acha a variante pelo discriminante e chama o `execute` dela. Sem `static`. Sem tabela de combinações.
- Objeto local de despacho por chave: só no front, dentro do hook. Cada ramo é uma referência a uma `const` ou uma função de uma linha. Sem tipo `Record`. No back, nunca.
- Tabela fixa de enum → valor: a classe `Map` do grupo **Back**, também no front. Valor que vem de tradução: `Map` local no hook de labels.
- Domínio legado com as interfaces no `index.ts`: a pasta nova (`filters/`) ganha `export * from './filters'` no fim dele. Quem usa importa de `models/<Domain>`.

### Back — [arquitetura-back.md](arquitetura-back.md), [arquitetura-back-casos.md](arquitetura-back-casos.md), [arquitetura-back-dados.md](arquitetura-back-dados.md)

- Tabela fixa de enum → valor, front e back: classe que estende `Map`, arquivo em `mappers/`, leitura com `.get()`. Sem `Record`, sem `mapa[chave]`.
- Erro em `data/messages.ts`. `const message` antes de todo `throw`.
- Mapper Prisma: `import type { Prisma, <Entity> as Prisma<Entity> }`. Aliases `Raw`, `CreateInput`, `UpdateInput`. `toCreatePersistence` / `toUpdatePersistence`.
- Mapper só copia o campo. Sem método novo que checa tipo, vazio, null, objeto ou array. Regra sobre o valor vira peça de papel.
- `IExecutable` (só quem orquestra): aliases `Input` e `Output` no topo. Sem tipo inline no `implements`.
- Várias entidades na mesma gravação: `*PrismaService` com `$transaction`.
- `IRequest` com tipos importados. Sem `Operacao.Request['campo']`.
- Passo do use case que usa dependência: método `private` de instância. Regra pura: peça de papel.
- Guard stateless: `type Guards` no `types.ts`. Validação com prefixo `assert`, que devolve `void`.
- `tenantId` primeiro. `context` primeiro, quando existir.
- Vários ids no banco: um método `readMany` no repositório. Sem `map` de `.read` dentro de `Promise.all`.
- Zod estende `ZodValidator`. Enum Prisma: `nativeEnum` + `errorMap`. Valor traduzido: `refine` + `transform`. Sem condições do Zod agrupadas inline.
- Teste rápido e isolado: InMemory, `vi.fn`, `vi.mock`. Cobre use case, service com regra e toda peça de papel nova. Não cobre `*Map` de Prisma nem tabela que estende `Map`.

## Pronto é

Scan limpo não prova a forma. Antes de dizer que terminou, confira:

- [ ] Li o código no branch da tarefa.
- [ ] Respondi o Portão de desenho antes de escrever.
- [ ] Nenhuma pergunta ao dono estava aberta quando escrevi. A resposta explica por que um efeito do pedido fica assim, ou avisa um caso que fica de fora? Era pergunta: tire o código da resposta e pare nela.
- [ ] A peça nova tem nome de papel, mora na pasta do papel e implementa o protocolo. Uma regra só, a do pedido.
- [ ] Um método público, com o nome do protocolo.
- [ ] Sem `static` fora das duas exceções. Sem constructor com dados.
- [ ] `Input` e `Output` no topo. Sem opcional, `?.` ou `??` dentro da peça, salvo o default da `*ParamsFactory`. Tipo entra com `import type`.
- [ ] Quem usa guarda a instância (`private readonly`, ou `const` de módulo no hook, no dono `static` e no arquivo Zod).
- [ ] No arquivo velho, só entraram linhas novas, e no máximo mudou a linha que passa a chamar a peça. Nenhuma assinatura mudou.
- [ ] Spec ao lado, escrita. O caso que passa traz o vizinho que a regra não pega, e o que age traz a borda da regra, se ela tem. Protocolo novo exportado no `index.ts`.
- [ ] Use case, provider, service ou hook velho que mudou ganhou um `it` na spec que já roda ele, se ela existe.
- [ ] Scan rodado nos arquivos alterados e criados. Limpo nas linhas que você escreveu.

Faltou um? Não terminou.

Na resposta, o scan é uma frase: `Scan limpo.` Não liste o que conferiu: nem o scan por arquivo, nem como rodou, nem esta lista, nem por que não perguntou. Sem scan rodado, a primeira linha da resposta diz: Não terminei, falta o scan. Resposta que para na pergunta do Portão não tem código e não leva essa frase.

## Como crescer

O usuário só diz a regra. Quem escreve nesta skill faz o resto, sem perguntar.

1. Uma linha nova no grupo certo, aqui em cima. A regra, não um texto longo. Se o assunto não cabe em nenhum grupo, uma linha na tabela do índice apontando o arquivo. Se a regra muda o desenho (papel, protocolo, `static`, onde a regra mora), ela entra também no Portão e no [desenho.md](desenho.md).
2. O exemplo errado e o certo no arquivo desse grupo. Não crie arquivo novo se o grupo já existe. Depois procure nos capítulos todo exemplo que ensina a forma velha e troque. Cada regra tem uma casa só: a linha do SKILL.md, quando a regra inteira cabe nela, ou um capítulo. Lista, exceções e exemplo ficam na casa. Nos outros arquivos, uma linha que aponta para ela. Exemplo certo segue todas as regras da skill, não só a nova.
3. Abra `~/.claude/skills/formatos-pipeline/scan/phases/` e releia os checadores. Aí decida:

- Dá para achar no texto? Exemplos: uma palavra, um comentário, `Record`, `mapa[chave]`, `static` em classe de papel, método `apply` / `run` / `process`, `private constructor`, `?.` em `filters/`, pasta `tools/` / `helpers/` / `utils/` no caminho. Coloque o checador na fase da mesma família. Se não existir fase, crie o arquivo e registre em `phases/index.js`, na ordem: nomes, mapas, escrita, actions, tipos. Atualize a ordem em `~/.claude/skills/formatos-pipeline/SKILL.md`.
- É forma (qual classe, qual padrão)? Não crie checador. O exemplo do passo 2 e o **Pronto é** seguram. O gancho não enxerga forma.
- Não crie gancho novo. Os três que existem bastam: marcar o arquivo editado, limpar a lista quando a pessoa manda outra mensagem, checar quando a IA tenta parar.
- Não mude a ordem das fases se a regra cabe numa fase que já existe.
