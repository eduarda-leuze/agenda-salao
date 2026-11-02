# Sistema do salão (agenda + agendamento online + robô do WhatsApp)

Tudo num projeto só, para publicar na Vercel. O banco de dados (clientes, agenda,
financeiro, logins) continua no Lovable Cloud; este projeto só se conecta a ele.

## Páginas

| Endereço | O que é |
| --- | --- |
| `/` ou `/auth` | Entrada (login, criar conta, esqueci a senha) |
| `/painel` | Visão geral (administradora) |
| `/agenda` | Agenda por dia, semana e lista |
| `/clientes`, `/servicos`, `/profissionais` | Cadastros |
| `/financeiro`, `/comissoes` | Financeiro |
| `/whatsapp` | Conversas do robô, pausar/retomar e área de teste |
| `/configuracoes` | Aparência e marca, robô do WhatsApp, regras e horários |
| `/agendar` | Página pública para as clientes agendarem |
| `/api/whatsapp` | Endereço que o Bird chama (webhook) |

## Publicar na Vercel

1. Crie a conta em vercel.com (plano Hobby, grátis).
2. No Terminal, dentro desta pasta:
   ```bash
   npx vercel login
   npx vercel link        # aceite os padrões
   npx vercel env add NOME_DA_VARIAVEL production   # repita para cada variável abaixo
   npx vercel deploy --prod
   ```
   (Ou crie o projeto pelo site, envie a pasta pelo GitHub e cadastre as variáveis em
   Settings > Environment Variables.)

## Variáveis de ambiente

| Variável | O que é |
| --- | --- |
| `VITE_SUPABASE_URL` | Endereço do banco (no arquivo de variáveis) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave pública do banco (no arquivo de variáveis) |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` | Os mesmos dois valores acima |
| `BOT_TOKEN` | Senha do servidor no banco: usada pelo robô e pela página /agendar. **Não compartilhe** |
| `ANTHROPIC_API_KEY` **ou** `OPENAI_API_KEY` | Chave da IA do robô |
| `AI_MODEL` | Opcional. Padrão: `claude-haiku-5-5` ou `gpt-4.1-mini` |
| `BIRD_API_KEY` | Chave de API do Bird com permissão de WhatsApp |
| `BIRD_WHATSAPP_FROM` | Número do salão, formato `+55DDDNÚMERO` |
| `BIRD_WEBHOOK_SECRET` | Segredo `whsec_...` mostrado ao criar o webhook no Bird |

Depois de mudar variáveis, publique de novo (`npx vercel deploy --prod`).

## Ligar o WhatsApp

1. Conecte o número do salão no Bird (WhatsApp > Numbers > New number > Keep using the
   Business app). Funciona junto com o app WhatsApp Business no celular.
2. Bird > Webhooks > novo endpoint:
   - URL: `https://SEU-SITE.vercel.app/api/whatsapp` (copie em Configurações > Robô do WhatsApp)
   - Eventos: `whatsapp.received`, `whatsapp.accepted`, `whatsapp.sent`, `whatsapp.delivered`
3. Cadastre `BIRD_API_KEY`, `BIRD_WHATSAPP_FROM` e `BIRD_WEBHOOK_SECRET` na Vercel e publique.
4. Teste em `/whatsapp` > "Testar o robô" antes de ligar.

Como o robô se comporta:
- Tira dúvidas usando os serviços/preços cadastrados e o campo "Informações para o robô".
- Marca, consulta, cancela e remarca (sempre confirmando antes); agendamentos entram com o
  ícone de WhatsApp na agenda.
- Se a cliente pedir uma pessoa, pausa e avisa no painel.
- Se alguém responder pelo celular, pausa 12 horas naquela conversa.

## Mudanças em relação à versão do Lovable

- Saíram os botões "Entrar com Google" e "Continuar com Lovable" (fica e-mail e senha) e
  entrou "Esqueci minha senha".
- Página /agendar, imagens da marca e criação de acesso das profissionais passaram a usar
  funções seguras do banco (não dependem mais da chave interna do Lovable).
- A foto padrão da tela de entrada virou um degradê rosé; envie a sua em Configurações >
  Aparência e marca.

## Desenvolvimento

```bash
bun install
bun run test        # testes
bun run typecheck   # verificação de tipos
bun run dev         # roda no computador (precisa das variáveis VITE_ num arquivo .env)
```
