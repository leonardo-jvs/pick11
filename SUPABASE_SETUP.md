# Pick11 — Multiplayer Online (Fases 1, 2 e 3: Supabase completo)

Este documento explica como configurar o backend Supabase destas fases, rodar
o projeto localmente e publicar na Vercel.

## O que já está pronto

**Fase 1 — Salas e Lobby:**
- Banco de dados real (Postgres via Supabase) para salas e participantes.
- Sincronização em tempo real do Lobby: quando alguém entra, sai, fica pronto
  ou muda de tática, todo mundo na sala vê na hora, sem dar F5.
- Presença online/offline por sala.
- Identidade persistente via Supabase Auth anônimo — atualizar a página ou
  fechar o navegador e voltar depois reconecta você automaticamente.
- Administrador de sala real, com transferência automática se o host sair.

**Fase 2 — Draft sincronizado:**
- O Draft inteiro agora existe no servidor (tabela `draft_states`): timer,
  ordem das escolhas, cartas disponíveis, jogadores já escolhidos — tudo
  sincronizado em tempo real entre todos os participantes.
- Todos os clientes calculam a contagem regressiva a partir do mesmo
  `turn_deadline` do servidor, não de um relógio local — sem risco de
  divergência entre navegadores.
- Proteção contra corrida (ex: o timer zera no exato instante em que alguém
  confirma o pick): a escrita usa concorrência otimista — só a primeira
  tentativa é aceita, as demais são descartadas e sincronizadas via Realtime.
- Reconexão também funciona no meio do Draft.
- Só o host escreve o estado inicial do Draft; os demais participantes
  reagem automaticamente à mudança de status da sala.

**Fase 3 — Liga/Copa sincronizadas (elencos, partidas, classificação):**
- Elencos, calendário (Liga) ou grupos/chaveamento (Copa) são gerados uma
  única vez pelo host e sincronizados pra todo mundo (tabela `competition_states`).
- Pré-Partida com confirmação por confronto: quando o adversário é humano, o
  botão mostra "Iniciar Partida (1/2)" e atualiza em tempo real assim que ele
  confirma também.
- Cada rodada só é calculada quando todos os jogadores envolvidos confirmaram
  (ou o prazo de 10s vence) — e **qualquer participante conectado** pode
  disparar esse cálculo, não só o host, então a rodada nunca trava se o host
  cair no meio do caminho. Protegido pela mesma trava de concorrência das
  fases anteriores.
- Todos os jogadores de um confronto veem exatamente o mesmo resultado (placar,
  eventos, estatísticas) — calculado uma única vez no servidor.
- Classificação, calendário e físico dos times atualizam automaticamente pra
  todo mundo depois de cada rodada.
- "Nova Liga"/"Nova Copa": botão exclusivo do host nas telas de Final —
  encerra a competição atual, mantém todos na mesma sala, e devolve pro Lobby
  prontos pra um novo Draft.

**Importante sobre como as partidas são sincronizadas:** o Pick11 não tem (e
esta sprint não construiu) um motor de partida que gera eventos em tempo real
minuto a minuto. O resultado de uma partida sempre foi — e continua sendo —
calculado de uma vez só; o que muda agora é que esse cálculo acontece no
servidor, então os dois jogadores de um confronto leem exatamente o mesmo
resultado e cada um narra essa mesma informação localmente com o efeito de
"ao vivo" que já existia. Construir um motor de partida com eventos
realmente transmitidos em tempo real seria um projeto à parte, bem maior que
esta sprint — se isso for importante pra você, vale conversarmos sobre como
abordar especificamente.

---

## 1. Criar o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta (grátis).
2. Clique em **New Project**. Escolha um nome, uma senha de banco (guarde
   essa senha) e a região mais próxima dos seus jogadores.
3. Aguarde alguns minutos até o projeto ficar pronto.

## 2. Rodar as migrations (criar as tabelas)

1. No painel do seu projeto, vá em **SQL Editor** → **New query**.
2. Rode, **nesta ordem**, o conteúdo de cada arquivo:
   - `supabase/migrations/0001_rooms_and_lobby.sql`
   - `supabase/migrations/0002_draft_state.sql`
   - `supabase/migrations/0003_competition_state.sql`
   - `supabase/migrations/0004_league_knockout_mode.sql` (novo modo "Liga + Mata-Mata")
   - `supabase/migrations/0005_x1_mode.sql` (novo modo "X1" — se seu projeto já rodou as anteriores, só precisa rodar esta)
3. Clique em **Run** para cada um. Deve aparecer "Success. No rows returned".

Se preferir a [Supabase CLI](https://supabase.com/docs/guides/cli): os
arquivos já estão no formato esperado em `supabase/migrations/`, então
`supabase db push` (com o projeto linkado) roda todos na ordem certa.

## 3. Habilitar login anônimo

O Pick11 não pede cadastro — cada navegador recebe uma identidade anônima
estável (é o que permite reconectar depois de atualizar a página).

1. No painel do Supabase, vá em **Authentication** → **Providers**.
2. Encontre **Anonymous Sign-Ins** e habilite.

Sem esse passo, criar ou entrar em uma sala vai falhar com um erro claro
pedindo pra habilitar essa opção.

## 4. Pegar as credenciais da API

1. Vá em **Project Settings** (ícone de engrenagem) → **API**.
2. Copie:
   - **Project URL**
   - **anon public** key (a chave pública — não é a `service_role`, essa
     nunca deve ir para o frontend)

## 5. Configurar o `.env.local`

Na raiz do projeto:

```bash
cp .env.local.example .env.local
```

Edite `.env.local` e cole os dois valores do passo anterior:

```
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

## 6. Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`. Para testar o multiplayer de verdade, abra o
mesmo link em duas abas (ou um navegador normal + uma aba anônima — cada
aba anônima recebe sua própria sessão do Supabase, então é como simular dois
jogadores diferentes) e crie uma sala numa aba, entre com o código na outra.

## 7. Publicar na Vercel

1. Suba o projeto para um repositório Git (GitHub, GitLab, etc.).
2. Em [vercel.com](https://vercel.com), clique em **Add New → Project** e
   importe o repositório.
3. Em **Environment Variables**, adicione as mesmas duas variáveis do
   `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Clique em **Deploy**.

Nenhuma configuração adicional é necessária — o projeto continua sendo um
Next.js padrão, só que agora com o Supabase como backend.

---

## Variáveis de ambiente — referência rápida

| Variável | Onde encontrar | Pode expor no navegador? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL | Sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon public | Sim (a segurança vem do RLS, não do sigilo dessa chave) |

Nunca coloque a chave `service_role` em variáveis `NEXT_PUBLIC_*` — ela
ignora todas as políticas de RLS e não deve existir no frontend.

---

## Arquitetura desta fase

```
Frontend (Next.js, client components)
   │
   ├─ lib/supabase/client.ts            → cliente único do Supabase (browser)
   ├─ lib/supabase/auth.ts              → sessão anônima persistente
   ├─ services/roomService.ts           → CRUD de salas/participantes
   ├─ services/draftSyncService.ts      → inicia/lê/escreve o Draft (com CAS)
   ├─ services/competitionSyncService.ts → inicia/lê/escreve a Liga/Copa (com CAS)
   ├─ services/draftService.ts          → TODA a lógica do Draft (inalterada)
   ├─ services/leagueService.ts         → TODA a lógica da Liga (inalterada)
   ├─ services/cupService.ts            → TODA a lógica da Copa (inalterada)
   ├─ services/matchPrepService.ts      → lógica de bônus/físico (inalterada)
   ├─ hooks/useRoomRealtime.ts          → sincroniza rooms/room_participants
   ├─ hooks/useRoomPresence.ts          → quem está online agora
   ├─ hooks/useDraftRealtime.ts         → sincroniza draft_states
   ├─ hooks/useCompetitionRealtime.ts   → sincroniza competition_states
   └─ store/sessionStore.ts             → cache local (Zustand) espelhando o servidor
   │
   ▼
Supabase (Postgres + Realtime + Auth)
   ├─ rooms
   ├─ room_participants
   ├─ draft_states        (Fase 2)
   └─ competition_states  (Fase 3)
```

Importante: em nenhuma das três fases nenhuma regra do jogo foi duplicada em
SQL. Todos os `services/*.ts` que já existiam antes desta sprint (Draft,
Liga, Copa, bônus, simulação de partida) continuam sendo a única fonte de
verdade da lógica — o Supabase só guarda e sincroniza o estado que essas
funções já produziam, agora compartilhado entre todos os participantes em
vez de viver isolado em cada navegador.

## Por que Supabase e não um backend separado

Confirmando a decisão pedida no briefing: Supabase atende os três requisitos
(Postgres + tempo real + fácil de publicar na Vercel) sem precisar manter um
servidor Node/Express à parte. Não há limitação técnica que impeça essa
escolha para nenhuma das três fases.

## Limitações importantes desta entrega

Não tenho acesso de rede a `supabase.co` neste ambiente, então não consegui
provisionar um projeto real nem rodar as migrations/testar a sincronização ao
vivo em nenhuma das três fases. O SQL e o código foram escritos com cuidado
seguindo a documentação oficial do Supabase, e revisei manualmente as
políticas de RLS e a lógica de concorrência mais de uma vez em busca de erros
sutis — encontrei e corrigi vários ao longo do caminho (uma política de
UPDATE bloqueando a transferência de administrador na Fase 1, um GRANT
faltando na Fase 1, uma referência quebrada a uma variável removida na Fase
3, e uma corrida não tratada na confirmação de presença da Pré-Partida).
Mesmo assim, **teste num projeto real antes de considerar isso pronto**:

- Abra o Draft em duas abas anônimas e confirme que uma escolha numa aba
  aparece instantaneamente na outra.
- Numa sala com 2 jogadores humanos, chegue à Pré-Partida em ambas as abas e
  confirme presença em momentos diferentes — o contador "(1/2)" deve
  atualizar sozinho, e a partida deve começar automaticamente pros dois ao
  mesmo tempo, com o mesmo placar.
- Teste "Nova Liga" com 2+ jogadores na sala.

Também vale registrar: como explicado acima, as partidas não são transmitidas
evento a evento em tempo real — são calculadas uma vez no servidor e cada
cliente narra o mesmo resultado localmente. Isso atende ao pedido de "todos
os jogadores envolvidos recebem exatamente o mesmo resultado", mas não é um
motor de partida ao vivo de verdade.
