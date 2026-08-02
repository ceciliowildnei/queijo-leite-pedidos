# Integração Meta — Queijos WR

## Endereços

Após publicar na Vercel:

- Webhook: `https://SEU-DOMINIO/api/meta/webhook`
- Diagnóstico: `https://SEU-DOMINIO/api/meta/status`
- Envio administrativo: `https://SEU-DOMINIO/api/meta/send`
- Campanha semanal: `https://SEU-DOMINIO/api/cron/friday-campaign`

## Variáveis obrigatórias na Vercel

- `META_WHATSAPP_TOKEN`
- `META_WHATSAPP_PHONE_NUMBER_ID`
- `META_WEBHOOK_VERIFY_TOKEN`
- `META_APP_SECRET`
- `META_GRAPH_VERSION` (exemplo: uma versão atualmente suportada pela Meta)
- `SUPABASE_SERVICE_ROLE_KEY`
- `WR_ADMIN_API_SECRET`
- `CRON_SECRET`

Para Instagram:

- `META_INSTAGRAM_ACCESS_TOKEN`
- `META_INSTAGRAM_USER_ID`

Nunca grave esses valores no GitHub ou no código do navegador.

## Configuração do webhook na Meta

No produto WhatsApp do aplicativo Meta, informe a URL `/api/meta/webhook` e o mesmo valor de `META_WEBHOOK_VERIFY_TOKEN`. Assine o campo `messages`.

O endpoint valida também `x-hub-signature-256` usando `META_APP_SECRET`.

## Chatbot incluído

- menu inicial;
- lista de produtos ativos do Supabase;
- criação de reserva inicial em `wr_pedidos`;
- consulta do pedido mais recente;
- encaminhamento textual para atendente.

A reserva automática começa com quantidade 1 e deixa entrega e pagamento como “A confirmar”, para evitar assumir dados do cliente.

## Campanha de sexta-feira

O cron roda às 20:00 UTC de sexta-feira, equivalente a 17:00 em São Paulo.

A campanha permanece desativada até que `wr_config` contenha:

- `meta_campanha_sexta_ativa`: `true`;
- `meta_template_sexta`: nome exato do modelo aprovado;
- `meta_template_idioma`: normalmente `pt_BR`;
- `meta_contatos_marketing`: lista de contatos com `telefone`, `nome`, `ativo: true` e `consentimento: true`.

Exemplo do valor de `meta_contatos_marketing`:

```json
[
  {
    "nome": "Cliente",
    "telefone": "5518999999999",
    "ativo": true,
    "consentimento": true
  }
]
```

Para publicação no Instagram, configure `meta_instagram_sexta` com URL pública de imagem, legenda, tipo `FEED` ou `STORIES` e `ativo: true`.

## Segurança e consentimento

Disparos fora da janela de atendimento devem usar modelo aprovado pela Meta. Somente clientes com consentimento expresso devem entrar na lista de marketing.
