# Termo Online - Frontend Modelo

Este diretório é uma cópia separada do frontend atual, preparada para o backend que será implementado pelos colegas no repositório Java.

Nada aqui depende do `backend/` local. O contrato gRPC que o backend deve seguir fica em:

- `src/contracts/termo.proto`
- `BACKEND_CONTRACT.md`

## Escopo do produto

Este modelo implementa somente os requisitos enviados:

- nome do jogador;
- fila de busca;
- partida entre 2 jogadores;
- validação de chute pelo backend;
- cores da tentativa;
- eventos em tempo real;
- vitória, derrota e empate;
- palavra correta ao final;
- pessoas online;
- refresh durante partida;
- proteção por token local;
- espectador por URL;
- layout desktop e mobile;
- gRPC-Web;
- Caddy/HTTPS/proxy reverso para produção.

Não há ranking, histórico, login, salas privadas manuais, chat, perfil, estatísticas, tema extra ou persistência em banco.

## Rodar sem backend real

O mock é apenas ferramenta de desenvolvimento para testar o frontend antes do backend existir. Ele não é requisito de produto.

```powershell
npm install
npm run generate
$env:VITE_USE_MOCK_BACKEND="1"; npm run dev
```

O mock permite navegar pelo fluxo mínimo enquanto o backend Java ainda está incompleto.

## Rodar com backend real

Quando o backend Java + Envoy estiverem prontos:

```powershell
npm install
npm run generate
$env:VITE_GRPC_URL="http://localhost:8080"; npm run dev
```

Em produção, se `VITE_GRPC_URL` não for definido, o frontend usa `window.location.origin`. Assim `https://termooo.online/Termo/*` passa pelo Caddy e vai para o Envoy.

## Build

```powershell
npm run build
```

## Regras importantes

- Token de jogador fica só no `sessionStorage`.
- URL de partida usa só `/partida/{idPartida}`.
- Quem abre a URL sem token entra como espectador.
- O frontend espera gRPC-Web via Envoy.
- O Caddyfile deste modelo já serve SPA e faz proxy de `/Termo/*` para `envoy:8080`.
