# Contrato Backend - Termo Online

Este arquivo descreve o backend que o `frontend-modelo` espera. A fonte técnica exata é `src/contracts/termo.proto`.

O contrato cobre apenas os requisitos funcionais e não funcionais enviados. Não exige ranking, login, banco de dados, histórico permanente, chat, salas privadas manuais ou revanche.

## Stack esperada

- Java com gRPC.
- Envoy expondo gRPC-Web em HTTP.
- Caddy em produção, servindo o frontend e encaminhando `/Termo/*` para o Envoy.
- Estado em memória, sem banco de dados.

## RPCs obrigatórios

### `Conectar(JogadorRequest) -> LobbyResponse`

Entrada:

- `nome`: nome exibido do jogador.
- `client_session_id`: id local da aba/navegador, gerado pelo frontend.

Saída:

- `id_jogador`
- `id_partida`
- `nome_oponente`
- `token_jogador`

Comportamento:

- Se não houver adversário, manter o jogador aguardando.
- Se outro jogador chegar, criar partida.
- Não parear duas chamadas com o mesmo `client_session_id`.
- Se a chamada do jogador aguardando for cancelada por F5/fechar aba, remover esse jogador da fila.

### `EnviarPalavra(TentativaRequest) -> TentativaResponse`

Entrada:

- `id_jogador`
- `id_partida`
- `palavra_chutada`
- `token_jogador`

Saída:

- `cores`: 5 números, usando `0=cinza`, `1=amarelo`, `2=verde`.
- `acertou`
- `tentativas_restantes`
- `palavra_invalida`

Comportamento:

- Validar token antes de processar.
- Se token inválido, retornar `PERMISSION_DENIED`.
- Se partida não existir, retornar `NOT_FOUND`.
- Se a palavra não existir na lista válida, retornar `palavra_invalida=true`, sem consumir tentativa.
- Se a palavra for válida, consumir tentativa e emitir evento para adversário/espectadores.

### `MonitorarPartida(PartidaRequest) -> stream EventoPartida`

Entrada:

- `id_partida`
- `id_jogador`
- `token_jogador`
- `assistir`

Comportamento de jogador:

- Se `assistir=false`, validar `id_jogador + token_jogador`.
- Se token inválido, retornar `PERMISSION_DENIED`.
- Enviar eventos do adversário para o jogador.

Comportamento de espectador:

- Se `assistir=true`, não exigir token.
- Não permitir controle da partida.
- Enviar eventos `ESPECTADOR_JOGOU` com `id_jogador`, `nome_jogador` e `cores_oponente`.
- Não enviar palavras chutadas.

### `MonitorarOnline(OnlineRequest) -> stream OnlineResponse`

Comportamento:

- Contar conexões abertas com o site.
- Enviar `pessoas_online` ao conectar/desconectar.
- Remover conexão cancelada para evitar vazamento de memória.

## Eventos obrigatórios

### `OPONENTE_JOGOU`

Usado para jogador. Deve conter:

- `cores_oponente`
- `tentativa_numero`

### `OPONENTE_VENCEU`

Usado para avisar que o adversário acertou.

### `OPONENTE_ESGOTOU`

Usado para avisar que o adversário ficou sem tentativas.

### `PARTIDA_ENCERRADA`

Deve conter:

- `empate`
- `palavra_secreta`
- `voce_venceu`
- `mensagem`

Depois desse evento, o backend pode fechar o stream e remover a partida da memória.

### `ESPECTADOR_JOGOU`

Usado somente para espectadores. Deve conter:

- `id_jogador`
- `nome_jogador`
- `cores_oponente`
- `tentativa_numero`

## Regras de segurança

- O token de jogador deve ser aleatório e difícil de adivinhar.
- O token não deve aparecer na URL.
- `id_partida` sozinho não autoriza jogada.
- Quem tiver só a URL deve entrar como espectador.
- Estado de partidas encerradas deve ser removido da memória.

## Listas de palavras

O backend deve carregar:

- `palavras_validas.txt`: 5054 palavras para aceitar chutes.
- `palavras_sorteaveis.txt`: 1717 palavras para sortear respostas.

Regra:

- Toda palavra sorteável deve existir também nas válidas.
- Palavra inválida não consome tentativa.

## Erros esperados pelo frontend

- `INVALID_ARGUMENT`: nome vazio, sessão ausente ou campos obrigatórios ausentes.
- `NOT_FOUND`: partida não existe ou já foi removida.
- `PERMISSION_DENIED`: token inválido para controlar jogador.
- `FAILED_PRECONDITION`: jogador não está registrado ou partida já acabou para ele.

## Compatibilidade com o backend Java atual

O repositório Java original provavelmente já possui estruturas como `GameEngine`, `Partida`, `TermoServiceImpl` e `termo.proto`. O caminho mais seguro é evoluir o proto sem reutilizar campos com outro significado:

- manter campos antigos com o mesmo número;
- adicionar campos novos com números novos;
- gerar novamente os stubs Java;
- implementar token local em memória;
- registrar cancelamento de stream no lobby e no contador online;
- separar lista de chute válido da lista de sorteio.
