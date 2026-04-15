# Setup de nova instancia (Site + CMS)

Este guia provisiona uma nova instancia white label (1 cliente = 1 banco).

## 1) Criar infraestrutura

1. Criar um novo projeto no Supabase.
2. Configurar Storage bucket `portfolio-images` (publico).
3. Executar as migracoes SQL base da aplicacao.
4. Executar `database/migrations/20260409_cms_foundation.sql`.

## 2) Configurar usuarios e permissoes

1. Criar usuario admin no Supabase Auth.
2. Inserir role admin em `user_roles`:

```sql
insert into public.user_roles (user_id, role, email)
values ('USER_ID_AQUI', 'admin', 'EMAIL_ADMIN_AQUI')
on conflict (user_id)
do update set role = excluded.role, email = excluded.email;
```

3. Revisar policies RLS para tabelas de conteudo e operacao.

## 3) Configurar CMS (.env)

Preencher em cada deploy do CMS:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SEU_ANON_KEY
VITE_ENABLE_DEMO_LOGIN=false
VITE_ADMIN_EMAILS=admin@cliente.com
VITE_ENABLED_MODULES=blog,portfolio,microsaas,media,settings
```

## 4) Configurar Site (.env)

Preencher no frontend do cliente com o mesmo Supabase da instancia.

## 5) Branding e modulos

1. Acessar CMS > Configuracoes > Geral e preencher identidade.
2. Acessar CMS > Configuracoes > Modulos e habilitar o que sera vendido ao cliente.

## 6) QA antes de entrega

- Login admin funcionando.
- Roles funcionando (admin/editor).
- CRUD de blog funcionando.
- Upload de midia funcionando.
- Portfolio e microsaas funcionando.
- Persistencia de modulos funcionando (enabled_modules).
- Build do site e CMS sem erros.

## 7) Deploy e dominio

1. Deploy do site (dominio final do cliente).
2. Deploy do CMS (subdominio ex: `cms.cliente.com`).
3. SSL e DNS validados.

## 8) Pos-entrega

- Remover demo login em producao.
- Confirmar backup e exportacao.
- Ativar monitoramento de erros.
