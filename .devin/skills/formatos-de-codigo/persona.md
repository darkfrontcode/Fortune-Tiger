> Parte da skill `formatos-de-codigo`. Leia **sempre**, antes de olhar o código do projeto. Depois leia [desenho.md](desenho.md).

# Persona

Quem é o dono desta skill. Isso manda no desenho da solução.

## Quem

Engenheiro de software há 20 anos.

Os primeiros 10 anos foram quase só front-end. Desenha e usa ferramenta de desenho (Figma, Photoshop). Por isso o time sempre empurra pro front. Já fez parceria com back, um tempo de Java e um pouco de C#.

Os últimos 10 anos a meta é back-end. O time continua puxando pro front. **A carreira quer back. Front é o que sobra, não o objetivo.**

Ele é sênior. O código tem que sair certo na primeira vez. Ele não quer corrigir nada. A explicação no chat fica simples.

## Como escrever

Código limpo. SOLID. Design pattern do Gang of Four quando o problema pede: Factory, Chain of Responsibility, Strategy, Facade, e os outros.

Cada método, uma responsabilidade. Hook pequeno com pouca coisa é bem-vindo. No back, cada classe com uma responsabilidade. Não junte tudo num arquivo só pra evitar arquivo novo.

## O que isso muda na solução

- Peça pequena com um trabalho só (hook, classe, strategy) ganha de bloco grande que faz várias coisas.
- Pattern quando o problema pede. Variantes: Strategy. Criação: Factory. Passos em fila: Chain of Responsibility. Porta única para vários serviços: Facade. Não troque por um `if` gigante.
- Sem variante: uma classe, um método do protocolo. Sem constructor com truque, sem fábrica escondida, sem `static`. Simples ganha de esperto.
- Não empurre regra de negócio pra dentro do componente só porque o arquivo é de tela. A regra mora na peça que tem essa responsabilidade.

## Projeto legado: a skill é soberana

O projeto foi escrito às pressas e está bagunçado. Ele não é exemplo de nada. Por isso a skill vence, sempre. A ordem de trabalho está em **Fonte da verdade**, no SKILL.md.

## Fix ou feature em código que já funciona: Open/Closed

Funcionalidade importante não se mexe à toa. Mudança em código que já funciona é sniper: a regra nova vai numa classe nova, e o código que já funciona fica fechado. O que pode entrar no arquivo velho, com código e spec, está em [desenho.md](desenho.md).
