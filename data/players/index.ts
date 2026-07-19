import { Player } from "@/types/player";
import { CORINTHIANS_PLAYERS } from "./common/corinthians";
import { FLAMENGO_PLAYERS } from "./common/flamengo";
import { PALMEIRAS_PLAYERS } from "./common/palmeiras";
import { SAO_PAULO_PLAYERS } from "./common/saoPaulo";
import { GREMIO_PLAYERS } from "./common/gremio";
import { INTERNACIONAL_PLAYERS } from "./common/internacional";
import { ATLETICO_MG_PLAYERS } from "./common/atleticoMineiro";
import { CRUZEIRO_PLAYERS } from "./common/cruzeiro";
import { FLUMINENSE_PLAYERS } from "./common/fluminense";
import { BOTAFOGO_PLAYERS } from "./common/botafogo";
import { VASCO_PLAYERS } from "./common/vasco";
import { BAHIA_PLAYERS } from "./common/bahia";
import { FORTALEZA_PLAYERS } from "./common/fortaleza";
import { SANTOS_PLAYERS } from "./common/santos";
import { ATHLETICO_PR_PLAYERS } from "./common/athleticoPr";
import { CEARA_PLAYERS } from "./common/ceara";
import { MIRASSOL_PLAYERS } from "./common/mirassol";
import { BRAGANTINO_PLAYERS } from "./common/bragantino";
import { SPORT_PLAYERS } from "./common/sport";
import { JUVENTUDE_PLAYERS } from "./common/juventude";
import { PRIME_PLAYERS } from "./prime";
import { VETERAN_PLAYERS } from "./veteran";
import { LEGEND_PLAYERS } from "./legends";
import { PROCLUBS_PLAYERS } from "./proclubs";

/**
 * Série A do Brasileirão completa: 20 clubes cadastrados. Para adicionar uma
 * nova competição (Série B, Seleções, Champions, La Liga, Premier League...),
 * criar uma pasta irmã (ex: data/players/common-serie-b/) e agregar da mesma
 * forma — nenhuma outra parte do sistema precisa mudar.
 */
export const COMMON_PLAYERS: Player[] = [
  ...CORINTHIANS_PLAYERS,
  ...FLAMENGO_PLAYERS,
  ...PALMEIRAS_PLAYERS,
  ...SAO_PAULO_PLAYERS,
  ...GREMIO_PLAYERS,
  ...INTERNACIONAL_PLAYERS,
  ...ATLETICO_MG_PLAYERS,
  ...CRUZEIRO_PLAYERS,
  ...FLUMINENSE_PLAYERS,
  ...BOTAFOGO_PLAYERS,
  ...VASCO_PLAYERS,
  ...BAHIA_PLAYERS,
  ...FORTALEZA_PLAYERS,
  ...SANTOS_PLAYERS,
  ...ATHLETICO_PR_PLAYERS,
  ...CEARA_PLAYERS,
  ...MIRASSOL_PLAYERS,
  ...BRAGANTINO_PLAYERS,
  ...SPORT_PLAYERS,
  ...JUVENTUDE_PLAYERS,
];

export { PRIME_PLAYERS, VETERAN_PLAYERS, LEGEND_PLAYERS, PROCLUBS_PLAYERS };

/**
 * Todos os jogadores do banco, de todas as categorias ATIVAS.
 *
 * Pro Clubs está TEMPORARIAMENTE DESATIVADO (não faz parte desta atualização
 * de cartas) — PROCLUBS_PLAYERS continua totalmente preservado (arquivo,
 * dados, lógica de exibição) e importável normalmente, só não é somado aqui.
 * Para reativar no futuro, basta voltar a incluir `...PROCLUBS_PLAYERS` nesta
 * lista — nenhuma outra parte do sistema precisa mudar.
 */
export const ALL_PLAYERS: Player[] = [...COMMON_PLAYERS, ...PRIME_PLAYERS, ...VETERAN_PLAYERS, ...LEGEND_PLAYERS];
