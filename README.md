# Event-Driven Kafka Architecture

Este projeto tem como objetivo principal testar e demonstrar na prática os conceitos de **Arquitetura Orientada a Eventos (Event-Driven Architecture)** em sistemas distribuídos, utilizando **Apache Kafka**.

## 🚀 Sobre o Projeto

Em um sistema distribuído moderno, a comunicação assíncrona é fundamental para garantir escalabilidade, resiliência e baixo acoplamento entre serviços. Neste projeto, demonstramos a comunicação entre dois microsserviços distintos:
- **Module Orders (Módulo de Pedidos)**: Responsável por gerenciar os pedidos e emitir eventos quando um novo pedido é criado.
- **Module Notification (Módulo de Notificações)**: Consome os eventos gerados pelo módulo de pedidos e processa as notificações de forma assíncrona.

A grande vantagem documentada aqui é que ao invés de realizarem chamadas síncronas entre si (como via HTTP/REST) - que podem gerar gargalos de processamento, timeouts, e acoplamento forte - os serviços comunicam-se de forma totalmente reativa através de tópicos de eventos publicados e processados via Kafka.

## 🛠 Tecnologias Utilizadas

O projeto utiliza uma stack moderna para garantir alta performance, resiliência e manutenibilidade:

- **Linguagem & Runtime:** [TypeScript](https://www.typescriptlang.org/) executando sobre o [Bun](https://bun.sh/) (oferecendo alto desempenho desde o boot).
- **Framework Web:** [Hono](https://hono.dev/) integrado nativamente com Zod e OpenAPI para validação de dados em tempo de execução e documentação de APIs.
- **Mensageria:** [Apache Kafka 4.2](https://kafka.apache.org/) operando nativamente em KRaft (sem a necessidade de Zookeeper) com a biblioteca `kafkajs`.
- **Banco de Dados:** [MongoDB](https://www.mongodb.com/) sendo manipulado através do Mongoose.
- **Monorepo:** Estruturada modular gerenciada por intermédio do [Turborepo](https://turbo.build/).
- **Infraestrutura Local:** Docker e Docker Compose configurados para o provisionamento rápido e simples do ambiente local de banco y mensageria.

## 🏗 Estrutura do Monorepo

O repositório utiliza workspaces e concentra os microsserviços sob o diretório do Turborepo:

```text
packages/
 ├── node-module-orders/         # Microsserviço de Pedidos (API & Publisher)
 └── node-module-notification/   # Microsserviço de Notificações (Consumidor & API)
```

## ⚙️ Como Executar Localmente

### 1. Pré-requisitos
- O runtime de JavaScript [Bun](https://bun.sh/) instalado em sua máquina.
- [Docker](https://www.docker.com/) e Docker Compose instalados.

### 2. Iniciando a Infraestrutura base
No diretório raiz do projeto, provisione as dependências de banco de dados e mensagens do Apache Kafka via Docker executando:
```bash
docker compose up -d
```

> **Acesso rápido aos serviços infra que estarão no ar:**
> - **Kafka broker:** `localhost:9092` / `localhost:29092`
> - **Kafka UI** (Dashboard visual do Kafka): [http://localhost:8080](http://localhost:8080) (Acesse para monitorar os tópicos e fluxo local)
> - **MongoDB:** `localhost:27017`

### 3. Instalando e Compilando
Em seguida, instale as dependências para todos os pacotes simultaneamente e garanta se há algo a compilar. Na raiz:
```bash
bun install
```

### 4. Executando as APIs e Serviços
O Turborepo cuidará de disparar o comando para as demais bibliotecas do monorepo em modo de desenvolvimento, você apenas precisa iniciar com:
```bash
bun run dev
```

Essa linha de comando já irá colocar de pé em segundo plano a API do `module-orders` (na porta **3000**), logo como colocará a escutar os consumidores o serviço respectivo de notificações do `module-notification` (na porta **3200**).

## 📖 Fluxo Básico de Funcionamento de Exemplo

O modelo demonstra e testa na prática esse formato:
1. O cliente (usuário ou cliente Frontend) dispara uma chamada a um endpoint HTTP no **Module Orders** criando e efetivando um pedido.
2. O **Module Orders** cuida do seu domínio mantendo os dados salvos em estado na collection do banco de dados (MongoDB).
3. Após isso o sistema publica então formalmente e sob segurança o evento real de "Pedido Criado" (_OrderCreated_) no seu tópico alvo de processamento no broker Kafka.
4. Imediatamente a API resolve dando timeout ou dando sucesso com HTTP-code da devolução ao cliente, **sem gerar esperas ociosas com os provedores de SMTP/e-mails.**
5. De forma paralela e constante, lá no processo do **Module Notification** que escutava continuamente aos deltas neste tópico assincronamente... recebe a nova carga do pedido emitido e consome processando todas as eventuais regras de aviso de negócios como por exemplo enviando os devidos boletos, emails ou logs, separadamente sem travar ninguém. 

## 🧑‍💻 Principais Comandos Disponíveis (Turborepo)

Aqui está a relação dos atalhos registrados no topo para o root:

- `bun run build` - Roda o script de build paralelamente à todas as dependências do monolíto/monorepo.
- `bun run dev` - Monitoramento à 'Quente' nos diretórios das APIs localmente.
- `bun run format` - Executa a lint de padrões de espaços e indentamentos global via Prettier.
- `bun run check-types` - Exame formal nos tipos das estruturas dos arquivos via transpilação limpa do Typescript.
