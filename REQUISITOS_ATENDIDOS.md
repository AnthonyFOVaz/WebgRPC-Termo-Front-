# Requisitos atendidos pelo frontend-modelo

## Funcionais

- RF01: tela inicial recebe nome do usuario.
- RF02: ao entrar, frontend chama `Conectar` e mostra fila de busca.
- RF03: frontend espera `LobbyResponse` com `id_partida` quando backend parear dois jogadores.
- RF04: sorteio da palavra fica no backend; frontend nao sorteia palavra em producao.
- RF05: validacao de chute fica no backend; frontend exibe `palavra_invalida`.
- RF06: frontend renderiza `cores` retornadas pelo backend.
- RF07: frontend consome `MonitorarPartida` para receber jogada do adversario.
- RF08: frontend trata `PARTIDA_ENCERRADA` com vitoria, derrota ou empate.
- RF09: frontend exibe `palavra_secreta` ao final.
- RF10: frontend consome `MonitorarOnline` e mostra pessoas online.
- RF11: frontend usa `/partida/{idPartida}` e `sessionStorage` para restaurar apos refresh.
- RF12: frontend envia `client_session_id`; backend deve impedir self-match.
- RF13: frontend guarda e envia `token_jogador`; backend deve validar.
- RF14: abrir URL sem token entra em modo espectador.
- RF15: CSS possui layout desktop e mobile.

## Nao funcionais

- RNF01: `Caddyfile` preparado para HTTPS automatico em producao.
- RNF02: frontend nunca controla partida sem `token_jogador`; backend deve proteger localmente.
- RNF03: token fica em `sessionStorage`, nao na URL.
- RNF04: cliente usa gRPC-Web via `@connectrpc/connect-web`.
- RNF05: `Dockerfile` executa build e serve por Caddy.
- RNF06: CSS responsivo para desktop e celular.
- RNF07: estado local da partida persiste apos refresh na mesma aba.

## Fora de escopo proposital

- login;
- ranking;
- historico permanente;
- banco de dados;
- chat;
- salas privadas manuais;
- revanche;
- perfil de usuario;
- estatisticas extras.
