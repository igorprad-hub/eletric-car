# Vale a pena trocar por um elétrico?

Calculadora que compara o custo total de **manter o carro a combustão que você já tem**
contra **trocar por um elétrico**, mês a mês, e diz em quanto tempo os dois empatam.

```bash
npm install
npm run dev
```

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Sobe em `localhost:5173` já com um cenário preenchido e calculado |
| `npm run test` | Suíte do domínio (39 testes, sem DOM) |
| `npm run build` | Typecheck e build de produção em `dist/` |

## A ideia

A conta de padaria ("gasto R$ 800 de gasolina, vou gastar R$ 200 de luz, logo economizo
R$ 600") erra porque compara o custo do elétrico contra zero. Manter o carro atual
**também** custa: combustível, manutenção, seguro, IPVA e, sobretudo, desvalorização.

Aqui a comparação é entre dois futuros. Cada cenário carrega uma posição patrimonial:

```
posição(m) = −desembolsos acumulados + valor do carro − saldo devedor
custo(m)   = posição inicial comum − posição(m)
```

Os dois partem da mesma posição inicial (hoje você tem o carro a combustão e nenhuma
dívida), então as curvas são comparáveis e **o cruzamento delas é o breakeven**. Como
efeito colateral útil, a depreciação entra diluída mês a mês em vez de dar um salto no
último mês do gráfico.

## O que entra na conta

**Rodagem** separada entre cidade e estrada, porque o combustão faz mais km/l na estrada
e o elétrico faz o contrário — em velocidade alta o arrasto domina e quase não há
frenagem regenerativa.

**Combustível** com seletor de gasolina, etanol, diesel, GNV e flex. No flex, a parcela
rodada com etanol consome mais litros pelo fator de eficiência (~0,70). Há dois modos de
entrada: por km/l, ou pelo gasto mensal em reais, que costuma ser mais fiel.

**Energia** derivada da autonomia Inmetro. A etiqueta publica **um número só**: por baixo,
o PBE Veicular roda um ciclo urbano (FTP-75) e um rodoviário (HWFET) e combina o consumo
com pesos de 55% e 45%, no método da EPA. A calculadora desfaz essa média para separar
cidade e estrada, usando um fator editável de quanto a estrada consome a mais — derivação,
não medição. Depois vêm o fator de realidade, para clima e ar-condicionado, e as perdas
entre a tomada e a bateria. O custo sai de um
**mix de recarga**: casa, tarifa branca, solar, público AC, DC rápido e grátis. Carregar
em casa custa uma fração do DC de rodovia, e é aí que a conta se decide.

**Solar** não é um sim/não. Você informa a sobra mensal de geração, e só o que couber
nela sai a custo solar — o excesso volta para a tarifa residencial. O kWh solar também
não é zero: pela Lei 14.300 a energia injetada e resgatada paga o Fio B.

**Infraestrutura** de recarga como desembolso único no mês zero: wallbox, instalação e
eventual troca do padrão de entrada.

**Financiamento** pela Tabela Price, com entrada, juros ao mês, prazo e IOF. O saldo
devedor é abatido do patrimônio quando o contrato passa do horizonte da análise.

**Depreciação, seguro, IPVA e licenciamento**, com IPVA por estado e as regras de
isenção ou redução para elétricos.

**Reajustes anuais** separados para combustível, energia, seguro e manutenção.

**Sensibilidade**: varre uma variável por vez e mostra o ponto de virada — "a troca passa
a compensar com a gasolina acima de R$ 6,02". É a parte mais útil da ferramenta, porque a
resposta honesta nunca é um número só.

## O que não entra

- **Custo de oportunidade do capital.** Em compra à vista, o dinheiro parado renderia.
  Isso favoreceria o cenário de manter mais do que o mostrado. O modelo está preparado
  para receber uma taxa de desconto sem reescrita.
- **Troca de bateria.** A garantia costuma ir até cerca de 8 anos; em horizontes longos
  existe um risco que não está na conta.
- Híbridos e PHEV, consórcio e leasing.

## Sobre os números embutidos

`src/data/evModels.ts` traz preços e autonomias Inmetro **conferidos em setembro de 2026**
e válidos só para aquele momento. A lista inclui apenas modelos com autonomia Inmetro
publicada e preço corroborado — modelos sem número de ciclo Inmetro confiável ficaram de
fora de propósito, e a opção "Outro" existe para eles. Tesla não entra: não é vendida
oficialmente no Brasil.

`src/data/states.ts` é menos firme. As alíquotas gerais de IPVA são razoavelmente estáveis,
mas o tratamento dado a elétricos muda com frequência e várias regras têm teto de valor —
**essa parte não foi verificada e segue como ponto de partida**. O campo aceita o valor do
boleto digitado por cima da tabela. Confirme na Sefaz do seu estado.

O resultado é uma **estimativa**, não uma previsão. Vale o que valem as premissas.

## Organização

```
src/
├── domain/       lógica pura, sem React — é onde mora o modelo
│   ├── simulate.ts      o motor: gera os dois fluxos mensais
│   ├── energy.ts        consumo do elétrico e mix de recarga
│   ├── fuel.ts          consumo do combustão, incluindo flex
│   ├── financing.ts     Tabela Price, saldo devedor, juros
│   ├── depreciation.ts  decaimento geométrico com piso
│   ├── ownership.ts     IPVA, reajustes
│   ├── breakeven.ts     cruzamento das curvas
│   └── sensitivity.ts   varredura e ponto de virada
├── data/         modelos elétricos, estados, valores padrão
├── components/   formulários e resultados
└── hooks/        estado persistido, cenário na URL, medida de largura
```

Nenhum componente faz conta. Tudo em `domain/` é função pura, o que torna o modelo
testável e auditável — e é por isso que a suíte consegue verificar coisas como "a soma
das categorias bate com o custo acumulado no fim do horizonte".

As cores dos gráficos vêm de uma paleta validada para daltonismo (azul para manter,
laranja para trocar), aprovada nos testes de separação em modo claro e escuro. Não troque
sem revalidar.

## Compartilhar um cenário

O botão "Compartilhar cenário" grava na URL só o que difere dos padrões — um link de
algumas dezenas de caracteres, não de dois mil. O estado também fica em `localStorage`.
