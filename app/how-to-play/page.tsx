"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  Layers,
  Shirt,
  Gauge,
  Battery,
  Sparkles,
  Trophy,
  Swords,
  Play,
  Users,
  DoorOpen,
  Timer,
  Hourglass,
  GitBranch,
  Skull,
  TrendingUp,
} from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { Card } from "@/components/ui/Card";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

interface Section {
  icon: React.ReactNode;
  title: string;
  summary: string;
  body: React.ReactNode;
}

const SECTIONS: Section[] = [
  {
    icon: <Layers size={18} />,
    title: "O Draft",
    summary: "Como você monta seu elenco de 11 titulares",
    body: (
      <div className="space-y-2">
        <p>
          Cada participante escolhe <strong className="text-text-primary">11 titulares</strong>, um por um, em turnos
          alternados (draft "cobra": a ordem se inverte a cada rodada, pra ninguém escolher sempre por último).
        </p>
        <p>
          A cada turno aparecem <strong className="text-text-primary">6 cartas</strong> pra escolher — normalmente 2
          por vez. Você tem <strong className="text-text-primary">10 segundos</strong> pra decidir; se o tempo
          acabar, o sistema escolhe automaticamente pra você.
        </p>
        <p>
          Só pode escolher jogadores que sirvam pra uma posição ainda vaga na sua formação. Depois de escolhido, um
          jogador nunca mais aparece pra ninguém — nem outra versão dele (Comum, Auge, Lendária ou Pro Clubs).
        </p>
        <p>
          O administrador da sala pode ativar o modo <strong className="text-text-primary">Over Oculto</strong>: o
          Overall dos jogadores fica escondido durante o Draft, e só é revelado depois — testa mais o seu
          conhecimento de futebol do que o número da carta.
        </p>
      </div>
    ),
  },
  {
    icon: <Shirt size={18} />,
    title: "Escalação e tática",
    summary: "Formação, estilo de jogo e compatibilidade",
    body: (
      <div className="space-y-2">
        <p>
          Antes do Draft você escolhe uma <strong className="text-text-primary">formação</strong> (4-3-3 ou 4-4-2),
          um <strong className="text-text-primary">estilo de ataque</strong> e um{" "}
          <strong className="text-text-primary">estilo de defesa</strong>. Isso não muda mais durante o Draft.
        </p>
        <p>
          Cada jogador tem seu próprio estilo de ataque/defesa. Quando o estilo do jogador bate com a tática do seu
          time, ele ganha um bônus de Overall (até <strong className="text-text-primary">+2</strong>) — é a{" "}
          <strong className="text-text-primary">compatibilidade</strong>, mostrada em estrelas (★★★) em toda carta.
        </p>
      </div>
    ),
  },
  {
    icon: <Gauge size={18} />,
    title: "Overall",
    summary: "A força de um jogador ou de um time inteiro",
    body: (
      <div className="space-y-2">
        <p>
          É o número que resume a qualidade de um jogador. O <strong className="text-text-primary">Overall Final</strong>{" "}
          (o que realmente conta na simulação) já inclui o bônus de compatibilidade — é sempre esse número que
          aparece, do Draft até a Pré-Partida.
        </p>
        <p>
          O Overall do <strong className="text-text-primary">time</strong> é a média dos 11 titulares — quanto maior,
          mais forte seu time é considerado pela simulação. Mas overall alto não garante vitória: times mais fracos
          sempre têm chance real de surpreender.
        </p>
      </div>
    ),
  },
  {
    icon: <Sparkles size={18} />,
    title: "Cartas especiais",
    summary: "Comum, Auge, Lendária e Pro Clubs",
    body: (
      <div className="space-y-2">
        <p>
          A maioria das cartas do Draft é <strong className="text-text-primary">Comum</strong> — jogadores atuais dos
          clubes da Série A. Mas de vez em quando aparece algo raro:
        </p>
        <ul className="list-inside list-disc space-y-1 pl-1">
          <li>
            <strong className="text-prime-bright">Auge</strong> (roxa) — a melhor temporada da carreira de um
            jogador, com o clube e o ano marcados na carta.
          </li>
          <li>
            <strong className="text-legend-text">Lendária</strong> (dourada) — ídolos históricos do futebol
            brasileiro.
          </li>
          <li>
            <strong className="text-danger">Pro Clubs</strong> (vermelha) — jogadores fictícios especiais, os mais
            raros de todos.
          </li>
        </ul>
        <p>Cada atleta só existe uma vez por liga — se a versão Auge de alguém for escolhida, nenhuma outra versão dele aparece de novo naquela competição.</p>
      </div>
    ),
  },
  {
    icon: <Battery size={18} />,
    title: "Físico / Energia",
    summary: "Seu time cansa — e isso pesa de verdade",
    body: (
      <div className="space-y-2">
        <p>
          Todo time começa a competição com <strong className="text-text-primary">100% de físico</strong>. A cada
          partida, o físico titular desgasta um pouco (não tem volta automática) — times muito cansados perdem
          Overall de verdade na hora de simular, o suficiente pra mudar o resultado de uma partida.
        </p>
        <p>
          Administrar o desgaste ao longo da competição é uma escolha estratégica: usar o bônus{" "}
          <strong className="text-text-primary">Tirar o Pé</strong> de vez em quando recupera o físico titular,
          mesmo custando Overall na partida em que é usado.
        </p>
      </div>
    ),
  },
  {
    icon: <Timer size={18} />,
    title: "Bônus",
    summary: "Os três bônus disponíveis, e quando usar cada um",
    body: (
      <div className="space-y-2">
        <p>
          Antes de cada partida você pode escolher um bônus pro seu time (ou nenhum). Cada bônus tem um limite de
          usos por competição, exceto onde indicado:
        </p>
        <ul className="list-inside list-disc space-y-1.5 pl-1">
          <li>
            <strong className="text-text-primary">Bicho</strong> — +3 de Overall pros atacantes e meias. Bom pra
            jogos equilibrados, quando você quer forçar a vitória.
          </li>
          <li>
            <strong className="text-text-primary">Jogo importante</strong> — +3 de Overall pros defensores. Ideal
            quando o adversário é mais forte e você precisa segurar o resultado.
          </li>
          <li>
            <strong className="text-text-primary">Tirar o Pé</strong> — usos ilimitados. O time inteiro entra com −3
            de Overall na partida, mas todo o elenco titular volta pra 100% de físico logo depois. Vale a pena
            quando o físico já está baixo e a partida não é decisiva.
          </li>
        </ul>
      </div>
    ),
  },
  {
    icon: <Trophy size={18} />,
    title: "A Liga",
    summary: "Temporada completa, turno e returno",
    body: (
      <div className="space-y-2">
        <p>
          38 rodadas — cada time enfrenta todos os outros duas vezes (turno e returno, casa e fora). A{" "}
          <strong className="text-text-primary">classificação</strong> é decidida por pontos (vitória=3, empate=1),
          depois saldo de gols, depois gols marcados.
        </p>
        <p>
          Ao final, o campeão, o artilheiro, a melhor defesa e os times rebaixados (últimos colocados) aparecem na
          tela de encerramento. O administrador pode iniciar uma "Nova Liga" na mesma sala, sem ninguém precisar
          sair.
        </p>
      </div>
    ),
  },
  {
    icon: <Swords size={18} />,
    title: "A Copa",
    summary: "Formato curto, com grupos e mata-mata",
    body: (
      <div className="space-y-2">
        <p>
          Um formato mais rápido: fase de grupos (turno único, 3 rodadas) seguida de mata-mata. O tamanho da Copa se
          ajusta automaticamente à quantidade de participantes — de 8 a 20 equipes, sempre em grupos de 4.
        </p>
        <p>
          Nos grupos, os 2 primeiros de cada grupo (ou os melhores 2ºs colocados, dependendo do tamanho da Copa) se
          classificam pro mata-mata. A partir daí é <strong className="text-text-primary">Chaveamento</strong>{" "}
          (quartas, semifinal, final) — sempre jogo único, e empate vai pros pênaltis.
        </p>
        <p>
          <strong className="text-text-primary">Eliminação:</strong> perder uma partida do mata-mata encerra sua
          participação na Copa imediatamente — não tem segunda chance. A tela final mostra em qual fase você caiu,
          ou o troféu, se você foi campeão.
        </p>
      </div>
    ),
  },
  {
    icon: <Play size={18} />,
    title: "Simulação das partidas",
    summary: "Como o resultado é decidido",
    body: (
      <div className="space-y-2">
        <p>
          O resultado de cada partida é calculado de uma vez, usando o Overall dos dois times (com bônus e físico já
          aplicados), e depois narrado na tela como se fosse ao vivo: gols, cartões e as estatísticas do jogo
          (posse, finalizações, destaque da partida).
        </p>
        <p>
          Times mais fortes têm vantagem real, mas o resultado nunca é garantido — mesmo um time bem mais fraco
          sempre tem alguma chance de surpreender. É por isso que zebra existe.
        </p>
      </div>
    ),
  },
  {
    icon: <Users size={18} />,
    title: "Sistema Multiplayer",
    summary: "Jogando com outras pessoas, em tempo real",
    body: (
      <div className="space-y-2">
        <p>
          No Multiplayer, tudo que acontece numa sala — o Draft, a Pré-Partida, os resultados, a classificação — é
          sincronizado automaticamente entre todos os participantes. Ninguém precisa atualizar a página pra ver o
          que os outros fizeram.
        </p>
        <p>
          Se você atualizar a página ou fechar o navegador no meio de uma competição, ao voltar você reconecta
          automaticamente na sua sala e na sua equipe, exatamente de onde parou.
        </p>
      </div>
    ),
  },
  {
    icon: <DoorOpen size={18} />,
    title: "Sistema de Salas",
    summary: "Criar, entrar e administrar uma sala",
    body: (
      <div className="space-y-2">
        <p>
          Quem cria a sala vira o <strong className="text-text-primary">administrador</strong> — só ele pode iniciar
          uma nova competição ou fechar a sala pra todo mundo. Se o administrador sair, a administração passa
          automaticamente pra outro jogador, sem quebrar a sala.
        </p>
        <p>
          Outros jogadores entram digitando o código da sala. É possível ver quem está online, quem já está pronto,
          e todo mundo vê a mesma lista de participantes em tempo real.
        </p>
      </div>
    ),
  },
  {
    icon: <Hourglass size={18} />,
    title: "Cronômetros",
    summary: "Draft e Pré-Partida, sempre sincronizados",
    body: (
      <div className="space-y-2">
        <p>
          O cronômetro do Draft (10s por escolha) e o da Pré-Partida (10s de preparação) são{" "}
          <strong className="text-text-primary">compartilhados</strong> no Multiplayer: todo mundo vê exatamente o
          mesmo tempo restante, porque ele vem de um relógio único no servidor, não de cada celular ou computador
          separadamente.
        </p>
        <p>No Singleplayer, o cronômetro é simples e local — não depende de nenhuma sincronização.</p>
      </div>
    ),
  },
  {
    icon: <Gauge size={18} />,
    title: "Pré-Partida",
    summary: "A tela antes de cada jogo",
    body: (
      <div className="space-y-2">
        <p>
          Mostra o confronto, sua escalação, o físico e o Overall do seu time, e a chance de escolher um bônus. No
          Singleplayer existe um botão pra iniciar quando estiver pronto.
        </p>
        <p>
          No Multiplayer não existe botão — todos os confrontos da rodada começam juntos, automaticamente, assim que
          o cronômetro compartilhado chega a zero. Escolher um bônus já confirma sua presença na hora.
        </p>
      </div>
    ),
  },
  {
    icon: <GitBranch size={18} />,
    title: "Chaveamento",
    summary: "O mata-mata da Copa, visualmente",
    body: (
      <div className="space-y-2">
        <p>
          Depois da fase de grupos, uma tela de chaveamento mostra todos os confrontos do mata-mata — quartas,
          semifinal e final — com quem já venceu cada fase e quem ainda está por decidir.
        </p>
      </div>
    ),
  },
  {
    icon: <Skull size={18} />,
    title: "Eliminação nas Copas",
    summary: "Perder o mata-mata encerra sua participação",
    body: (
      <div className="space-y-2">
        <p>
          Diferente da Liga, a Copa não perdoa: perder uma partida do mata-mata tira você da competição na hora. A
          tela final mostra em qual fase isso aconteceu — ou celebra o título, se você chegou até o fim invicto no
          mata-mata.
        </p>
      </div>
    ),
  },
  {
    icon: <TrendingUp size={18} />,
    title: "Progressão das Ligas",
    summary: "Como a temporada avança, rodada a rodada",
    body: (
      <div className="space-y-2">
        <p>
          Cada rodada só termina de verdade quando todas as partidas (inclusive as só entre times controlados pela
          IA) forem concluídas. Só depois disso a classificação, o físico de todos os times e o calendário avançam
          pra próxima rodada — pra todo mundo, ao mesmo tempo.
        </p>
      </div>
    ),
  },
];

const CARD_GLOSSARY: { title: string; text: string }[] = [
  { title: "Overall", text: "A força geral da equipe (ou de um jogador) — a média dos titulares, já com compatibilidade aplicada." },
  { title: "Físico", text: "O quanto seu elenco titular ainda aguenta. Cai a cada partida disputada e pesa de verdade no resultado." },
  { title: "Classificação", text: "Sua posição atual na tabela da Liga, calculada por pontos, saldo de gols e gols marcados." },
  { title: "Fase", text: "Em qual etapa da Copa você está agora: fase de grupos, quartas, semifinal ou final." },
  { title: "Bônus", text: "O reforço tático escolhido pra a partida atual — Bicho, Jogo importante ou Tirar o Pé. Veja a seção 'Bônus' acima pra saber quando usar cada um." },
];

function AccordionItem({ section, isOpen, onToggle }: { section: Section; isOpen: boolean; onToggle: () => void }) {
  return (
    <Card className="overflow-hidden !p-0">
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">{section.icon}</span>
        <span className="flex-1">
          <span className="block font-sans text-sm font-semibold text-text-primary">{section.title}</span>
          <span className="block font-sans text-xs text-text-tertiary">{section.summary}</span>
        </span>
        <ChevronDown size={16} className={cn("shrink-0 text-text-tertiary transition-transform duration-200", isOpen && "rotate-180")} />
      </button>
      {isOpen && (
        <div className="border-t border-border-subtle px-4 py-3.5 font-sans text-xs leading-relaxed text-text-secondary">{section.body}</div>
      )}
    </Card>
  );
}

export default function HowToPlayPage() {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <Screen>
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1.5 font-sans text-xs text-text-tertiary transition-colors hover:text-text-primary"
      >
        <ArrowLeft size={14} />
        Voltar
      </button>
      <h1 className="mb-1 font-display text-3xl tracking-wide text-text-primary">COMO JOGAR</h1>
      <p className="mb-6 font-sans text-sm text-text-tertiary">Tudo o que você precisa saber, do Draft à Final</p>

      <div className="flex flex-col gap-2.5">
        {SECTIONS.map((section, i) => (
          <AccordionItem
            key={section.title}
            section={section}
            isOpen={openIndex === i}
            onToggle={() => setOpenIndex(openIndex === i ? null : i)}
          />
        ))}
      </div>

      <h2 className="mb-3 mt-8 font-display text-lg tracking-wide text-text-primary">O que cada informação significa</h2>
      <div className="flex flex-col gap-2.5">
        {CARD_GLOSSARY.map((item) => (
          <Card key={item.title}>
            <h3 className="mb-1 font-sans text-sm font-semibold text-gold">{item.title}</h3>
            <p className="font-sans text-xs leading-relaxed text-text-secondary">{item.text}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <button onClick={() => router.push(ROUTES.menu)} className="w-full text-center font-sans text-sm text-gold">
          Voltar ao menu
        </button>
      </div>
    </Screen>
  );
}
