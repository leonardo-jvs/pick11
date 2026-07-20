# ⚽ Pick11

> Monte seu time, dispute campeonatos e prove que você é o melhor manager.

O **Pick11** é um jogo multiplayer de Draft inspirado no Ultimate Team, onde os jogadores montam equipes através de escolhas estratégicas de cartas e disputam campeonatos em tempo real.

---

## 📖 Sobre o projeto

No Pick11, cada jogador participa de um Draft para montar sua equipe, escolhendo atletas de diferentes épocas do futebol brasileiro.

Após o Draft, os times disputam:

- 🏆 Liga
- 🏅 Copa Mata-Mata

Cada atleta possui atributos, raridade, posição, clube, temporada e overall próprios, tornando cada Draft diferente.

---

## ✨ Funcionalidades

- 🎴 Sistema de Draft
- 👥 Multiplayer em tempo real
- 🤖 Modo Singleplayer
- 🏆 Campeonato de Liga
- 🏅 Copa Eliminatória
- 📦 Sistema de Packs
- 💰 Mercado de Cartas
- ⭐ Cartas Comuns
- 🔥 Cartas Auge
- 👑 Cartas Lendárias
- 💎 Cartas Fim de Carreira
- 📊 Sistema de Overall
- 🧠 Auto Pick por tempo
- 🎲 Draft totalmente aleatório
- 📱 Interface responsiva

---

## 🎴 Sistema de Cartas

Cada jogador pode existir em diferentes versões.

### Comum

Representa uma temporada comum da carreira do atleta.

**Overall:** 80–85

---

### Auge

Representa o melhor momento da carreira.

Exemplos:

- Arrascaeta — Flamengo 2025
- Hulk — Atlético-MG 2022
- Raphael Veiga — Palmeiras 2022

---

### Lendária

Representa jogadores históricos do futebol brasileiro.

Exemplos:

- Rogério Ceni
- Zico
- Kaká
- Ronaldo
- Ronaldinho
- Neymar
- Marcelinho Carioca

---

### Fim de Carreira

Representa grandes jogadores em suas últimas temporadas atuando por clubes brasileiros.

---

## 🎮 Como funciona

1. Criar uma sala.
2. Convidar amigos.
3. Iniciar o Draft.
4. Montar o elenco.
5. Disputar Liga ou Copa.
6. Ganhar moedas.
7. Abrir Packs.
8. Melhorar a coleção.

---

## 🛠 Tecnologias utilizadas

- Next.js
- React
- TypeScript
- Supabase
- Tailwind CSS

---

## 🌐 Multiplayer

O jogo utiliza um sistema multiplayer em tempo real baseado no Supabase.

O Host da partida é responsável por:

- iniciar partidas;
- controlar o Draft;
- sincronizar o cronômetro;
- iniciar campeonatos;
- controlar Auto Pick;
- sincronizar Liga e Copa.

Todos os demais jogadores apenas recebem o estado sincronizado.

---

## 🎯 Objetivo

Construir o melhor elenco possível durante o Draft e conquistar todos os campeonatos disponíveis.

Cada escolha influencia diretamente o desempenho da equipe.

---

## 📂 Estrutura do projeto

```text
src/
 ├── app/
 ├── components/
 ├── hooks/
 ├── lib/
 ├── services/
 ├── types/
 ├── utils/
 └── styles/
```

---

## 🚀 Executando o projeto

### Clone o repositório

```bash
git clone https://github.com/SEU-USUARIO/pick11.git
```

Entre na pasta

```bash
cd pick11
```

Instale as dependências

```bash
npm install
```

Execute

```bash
npm run dev
```

Abra

```
http://localhost:3000
```

---

## 📈 Roadmap

- [x] Sistema de Draft
- [x] Multiplayer
- [x] Liga
- [x] Copa
- [x] Packs
- [x] Mercado
- [x] Coleção
- [x] Cartas Históricas
- [ ] Rankings Online
- [ ] Temporadas
- [ ] Missões
- [ ] Eventos Especiais
- [ ] Sistema de Evolução de Cartas
- [ ] Conquistas

---

## 🤝 Contribuição

Contribuições são bem-vindas!

Caso encontre bugs ou tenha sugestões, abra uma **Issue** ou envie um **Pull Request**.

---

## 📄 Licença

Este projeto é destinado para fins educacionais e de desenvolvimento de portfólio.

---

# 👨‍💻 Desenvolvedor

**Leonardo Santiago**

- GitHub: https://github.com/leonardo-jvs
- LinkedIn: https://www.linkedin.com/in/leonardo-jvsantiago

---

⭐ Se gostou do projeto, deixe uma estrela no repositório!
