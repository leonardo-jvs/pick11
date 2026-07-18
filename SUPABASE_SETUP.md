# Pick11 — Multiplayer Online (Fases 1 e 2: Supabase + Salas/Lobby + Draft)

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
  Nenhuma duplicação de turno ou "pick fantasma" é possível.
- Reconexão também funciona no meio do Draft: atualizar a página traz você de
  volta exatamente pro turno em que a sala está.
- Só o host escreve o estado inicial do Draft (evita que múltiplos clientes
  tentem criar o mesmo draft ao mesmo tempo); os demais participantes reagem
  automaticamente à mudança de status da sala.

O que **ainda não** está sincronizado (planejado para a Fase 3): partidas
simultâneas com canais por confronto, classificação/calendário no servidor,
Pós-jogo, botão "Nova Liga". A geração da Liga/Copa (elencos de bot, calendário)
e as partidas continuam rodando localmente no navegador de cada jogador, como
já funcionavam antes desta sprint — se houver mais de um humano na sala, cada
um roda essa etapa de forma independente por enquanto.

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
3. Clique em **Run** para cada um. Deve aparecer "Success. No rows returned".

Se preferir a [Supabase CLI](https://supabase.com/docs/guides/cli): os dois
arquivos já estão no formato esperado em `supabase/migrations/`, então
`supabase db push` (com o projeto linkado) roda os dois na ordem certa.

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
   ├─ lib/supabase/client.ts       → cliente único do Supabase (browser)
   ├─ lib/supabase/auth.ts         → sessão anônima persistente
   ├─ services/roomService.ts      → CRUD de salas/participantes
   ├─ services/draftSyncService.ts → inicia/lê/escreve o Draft (com CAS)
   ├─ services/draftService.ts     → TODA a lógica do Draft (inalterada — puro TS)
   ├─ hooks/useRoomRealtime.ts     → sincroniza rooms/room_participants
   ├─ hooks/useRoomPresence.ts     → quem está online agora
   ├─ hooks/useDraftRealtime.ts    → sincroniza draft_states
   └─ store/sessionStore.ts        → cache local (Zustand) espelhando o servidor
   │
   ▼
Supabase (Postgres + Realtime + Auth)
   ├─ rooms
   ├─ room_participants
   └─ draft_states  (Fase 2)
```

Importante: nenhuma regra do Draft foi duplicada em SQL. `services/draftService.ts`
continua sendo a única fonte de verdade da lógica (elegibilidade de posição,
ordem snake, sorteio de candidatos, auto-pick) — o Supabase só guarda e
sincroniza o `DraftState` que essas funções já produziam, agora compartilhado
entre todos os participantes em vez de viver isolado em cada navegador.

## Por que Supabase e não um backend separado

Confirmando a decisão pedida no briefing: Supabase atende os três requisitos
(Postgres + tempo real + fácil de publicar na Vercel) sem precisar manter um
servidor Node/Express à parte. Não há limitação técnica que impeça essa
escolha para o que esta fase e a próxima precisam.

## Limitação importante desta entrega

Não tenho acesso de rede a `supabase.co` neste ambiente, então não consegui
provisionar um projeto real nem rodar as migrations/testar a sincronização ao
vivo — nem na Fase 1, nem nesta. O SQL e o código foram escritos com cuidado
seguindo a documentação oficial do Supabase, e revisei manualmente as
políticas de RLS mais de uma vez em busca de erros sutis (encontrei e corrigi
dois: uma política de UPDATE bloqueando indevidamente a transferência de
administrador na Fase 1, e um GRANT faltando na função de gerar código de
sala). Mesmo assim, **teste num projeto real antes de considerar essa fase
100% validada** — em especial, abra o Draft em duas abas anônimas diferentes
e confirme que uma escolha feita em uma aba aparece instantaneamente na
outra, e que atualizar a página no meio do Draft reconecta corretamente.
