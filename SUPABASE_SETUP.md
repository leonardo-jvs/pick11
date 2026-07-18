# Pick11 — Multiplayer Online (Fase 1: Supabase + Salas/Lobby)

Este documento explica como configurar o backend Supabase desta Fase 1, rodar o
projeto localmente e publicar na Vercel.

## O que esta fase entrega

- Banco de dados real (Postgres via Supabase) para salas e participantes.
- Sincronização em tempo real do Lobby (Supabase Realtime): quando alguém
  entra, sai, fica pronto ou muda de tática, todo mundo na sala vê na hora,
  sem dar F5.
- Presença online/offline por sala (Supabase Realtime Presence).
- Identidade persistente via Supabase Auth anônimo — atualizar a página ou
  fechar o navegador e voltar depois reconecta você automaticamente na sua
  sala e equipe, sem precisar digitar nada de novo.
- Administrador de sala real (`rooms.host_id`), com transferência automática
  se o host sair, e ação de fechar a sala pra todo mundo.

O que **ainda não** está nesta fase (planejado para as Fases 2 e 3): Draft
sincronizado entre jogadores, partidas simultâneas com canais por confronto,
classificação/calendário no servidor, botão "Nova Liga". Até lá, essas etapas
continuam rodando localmente no navegador de cada jogador, como já
funcionavam antes desta sprint.

---

## 1. Criar o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta (grátis).
2. Clique em **New Project**. Escolha um nome, uma senha de banco (guarde
   essa senha) e a região mais próxima dos seus jogadores.
3. Aguarde alguns minutos até o projeto ficar pronto.

## 2. Rodar a migration (criar as tabelas)

1. No painel do seu projeto, vá em **SQL Editor** (ícone de terminal na
   barra lateral) → **New query**.
2. Abra o arquivo `supabase/migrations/0001_rooms_and_lobby.sql` deste
   repositório, copie todo o conteúdo e cole no editor.
3. Clique em **Run**. Deve aparecer "Success. No rows returned".

Isso cria as tabelas `rooms` e `room_participants`, os índices, as políticas
de segurança (RLS) e habilita o Realtime para as duas tabelas.

Se você preferir usar a [Supabase CLI](https://supabase.com/docs/guides/cli)
em vez do SQL Editor: o arquivo já está no formato esperado em
`supabase/migrations/`, então `supabase db push` (com o projeto linkado)
também funciona.

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
   ├─ lib/supabase/client.ts     → cliente único do Supabase (browser)
   ├─ lib/supabase/auth.ts       → sessão anônima persistente
   ├─ services/roomService.ts    → CRUD de salas/participantes (Postgres)
   ├─ hooks/useRoomRealtime.ts   → sincroniza mudanças no banco (Postgres Changes)
   ├─ hooks/useRoomPresence.ts   → quem está online agora (Realtime Presence)
   └─ store/sessionStore.ts      → cache local (Zustand) espelhando o servidor
   │
   ▼
Supabase (Postgres + Realtime + Auth)
   ├─ rooms
   └─ room_participants
```

O Zustand continua existindo, mas mudou de papel: antes ele *era* a fonte da
verdade; agora ele é um espelho local do que está no Supabase, atualizado
automaticamente pelos hooks de tempo real. Isso deixa o resto da interface
(que já lê do `sessionStore`) praticamente intocado.

## Por que Supabase e não um backend separado

Confirmando a decisão pedida no briefing: Supabase atende os três requisitos
(Postgres + tempo real + fácil de publicar na Vercel) sem precisar manter um
servidor Node/Express à parte. Não há limitação técnica que impeça essa
escolha para o que esta fase e as próximas duas precisam.

## Limitação importante desta entrega

Não tenho acesso de rede a `supabase.co` neste ambiente, então não consegui
provisionar um projeto real nem rodar a migration/testar a sincronização ao
vivo. O SQL e o código foram escritos com cuidado seguindo a documentação
oficial do Supabase, mas **teste num projeto real antes de considerar essa
fase 100% validada** — especialmente os nomes de canais do Realtime e as
políticas de RLS, que são a parte mais sensível a pequenos erros de sintaxe
que só aparecem rodando de verdade.
