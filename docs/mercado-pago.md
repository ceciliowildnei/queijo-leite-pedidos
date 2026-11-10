# Pix do Mercado Pago — Queijos WR

Implementação preparada, desativada por padrão. Não cria nem altera tabelas, colunas ou relações. Usa `wr_pedidos` e registros individuais de cobrança em `wr_config`. Não importa pagamentos antigos nem concilia Pix feitos diretamente para uma chave avulsa.

## Fluxo

1. O cliente envia o pedido ao número da **WhatsApp Business Platform** configurado no servidor.
2. O bot apresenta o resumo e o cliente responde CONFIRMAR.
3. Após o registro, o bot informa o código e pede `PIX CODIGO email@cliente.com`.
4. Esse comando gera uma cobrança para o próprio cliente autenticado pela origem da mensagem assinada pela Meta. O valor vem dos itens persistidos, nunca do texto do cliente. O cliente recebe copia e cola e o link do Mercado Pago com QR Code.
5. O webhook assinado consulta o pagamento no Mercado Pago e confere identificação, moeda, ambiente, valor e itens atuais antes de marcar todas as linhas como Pago.
6. Se um template de confirmação estiver configurado, envia a confirmação pelo WhatsApp.

A conversa do WhatsApp Web aberta no ChatGPT não configura a API da Meta. As credenciais existentes precisam ser verificadas antes da ativação. Pedidos feitos pelo painel continuam funcionando normalmente, mas este primeiro fluxo de geração Pix é pelo WhatsApp; não há botão de cobrança no painel.

## Configuração no servidor

Na aplicação Mercado Pago, selecione **Checkout Transparente / Payments**, com Pix. Use primeiro o ambiente de teste. Ative as credenciais de produção somente depois da validação. Não cole tokens em chat, código, frontend, GitHub ou `wr_config`.

Variáveis privadas na Vercel, no projeto `ceciliowildnei-queijo-leite-pedidos`:

| Variável | Conteúdo |
| --- | --- |
| `MERCADOPAGO_ACCESS_TOKEN` | Access Token do ambiente escolhido |
| `MERCADOPAGO_WEBHOOK_SECRET` | Assinatura secreta da configuração de Webhooks |
| `MERCADOPAGO_MODE` | `test` ou `production` (deve corresponder ao token) |
| `MERCADOPAGO_ENABLED` | `true` somente quando a configuração estiver completa |
| `APP_BASE_URL` | `https://ceciliowildnei-queijo-leite-pedidos.vercel.app` |
| `META_WHATSAPP_PAYMENT_TEMPLATE` | Nome do template de utilidade aprovado, opcional para baixa e obrigatório para confirmação via WhatsApp |

O template de confirmação deve conter uma variável de corpo, o código do pedido. Texto sugerido: “Recebemos o pagamento do pedido {{1}} da Queijos WR. Obrigado!” Usar template permite confirmação mesmo fora da janela de atendimento. Dependências Meta existentes: `META_APP_SECRET`, `META_WHATSAPP_TOKEN`, `META_WHATSAPP_PHONE_NUMBER_ID`, `META_WHATSAPP_VERIFY_TOKEN`.

No Mercado Pago, configure o tópico **Pagamentos** e a URL:

`https://ceciliowildnei-queijo-leite-pedidos.vercel.app/api/mercado-pago-webhook`

Configure também o webhook Meta existente `/api/whatsapp-webhook` e assine o evento de mensagens. Reimplante após configurar as variáveis.

## Validação antes da ativação

- `node --test tests/mercado-pago.test.mjs`
- `npm run build`
- Em teste, criar pedido, confirmar pelo WhatsApp, enviar o comando Pix e pagar com conta de teste conforme documentação do Mercado Pago.
- Confirmar callback assinado, todos os itens como Pago e total no painel, sem duplicar receita; reenviar o evento e conferir que não há nova alteração.
- Confirmar template aprovado e envio da mensagem ao cliente.
- Rejeitar callback sem assinatura, valor divergente e pagamento de teste em produção.

Os testes locais usam respostas simuladas e não substituem o teste real com as contas conectadas. Pix expirado ou pedido alterado fica para conferência manual; não gera automaticamente uma segunda cobrança. Estornos e devoluções não revertem a baixa automaticamente nesta versão. A confirmação usa marcador persistido para reduzir reenvios; uma interrupção após o envio e antes de salvar o marcador, ou notificações concorrentes, ainda pode causar mensagem repetida. A baixa no pedido é idempotente. Se a API de mensagens falhar, o webhook responde 503 para permitir nova tentativa.

## Referências oficiais

- https://www.mercadopago.com.br/developers/pt/docs/checkout-api-payments/integration-configuration/integrate-pix
- https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/additional-content/your-integrations/notifications/webhooks
- https://www.mercadopago.com.br/developers/pt/docs/your-integrations/credentials
