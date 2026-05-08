# Termo Online Frontend

Frontend do Termo Online, feito em React + Vite + TypeScript.

Este projeto foi separado para acompanhar o backend Java/gRPC que vai ser desenvolvido no outro repositório. O contrato que o backend precisa seguir está em:

- `src/contracts/termo.proto`
- `BACKEND_CONTRACT.md`

## O que este front cobre

- entrada com nome do jogador;
- busca por adversário;
- partida de 2 jogadores;
- envio de palavras;
- tabuleiro com cores;
- eventos em tempo real;
- vitória, derrota e empate;
- palavra final da partida;
- contador de pessoas online;
- refresh durante a partida;
- token local para proteger o jogador;
- espectador por URL;
- layout para desktop e celular.

O projeto não tem login, ranking, histórico, chat ou banco de dados.

## Rodar sem backend

Enquanto o backend ainda não estiver pronto, dá para usar um mock simples:

```powershell
npm install
npm run generate
$env:VITE_USE_MOCK_BACKEND="1"; npm run dev
```

## Rodar com backend

Com o backend Java + Envoy rodando:

```powershell
npm install
npm run generate
$env:VITE_GRPC_URL="http://localhost:8080"; npm run dev
```

## Build

```powershell
npm run build
```

## Observações

- O token do jogador fica no `sessionStorage`, nunca na URL.
- A URL da partida usa apenas `/partida/{idPartida}`.
- Quem abrir a URL sem token entra como espectador.
- Em produção, o Caddy serve o frontend e manda `/Termo/*` para o Envoy.
