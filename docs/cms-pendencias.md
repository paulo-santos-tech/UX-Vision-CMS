# Pendencias para o CMS ficar completo

## O que ja foi concluido

- Arquitetura modular por dominio (`modules/*`).
- Roteamento por URL com `react-router-dom`.
- Guards centralizados (autenticacao e admin).
- Sidebar profissional com seções e submenus.
- Breadcrumbs clicaveis e titulo dinamico por pagina.
- ErrorBoundary global com fallback amigavel.
- Lazy loading dos modulos (code splitting).
- Feature flags por instancia (provider + UI no Settings).

## O que ainda falta (prioridade alta)

1. **Migracao do banco para feature flags persistentes**
   - Adicionar coluna `enabled_modules` em `site_settings`.
   - SQL recomendado:

```sql
alter table public.site_settings
add column if not exists enabled_modules jsonb default '{
  "dashboard": true,
  "blog": true,
  "portfolio": true,
  "microsaas": true,
  "media": true,
  "settings": true
}'::jsonb;
```

2. **Sistema de notificacoes padrao (toasts/modais)**
   - Substituir `alert` e `confirm` por componentes de feedback.
   - Padronizar confirmacao de delete/publish.

3. **RLS e seguranca de producao**
   - Revisar politicas em `user_roles`, `site_settings`, `blog_posts`, `portfolio`, `microsaas`.
   - Garantir que `editor` nao altere operacao sensivel.

4. **Auditoria e trilha de alteracoes**
   - Tabela `audit_logs`.
   - Registrar create/update/delete + actor + entidade.

5. **Workflow editorial completo**
   - Revisao/aprovacao/agendamento com estados.
   - Versionamento com rollback.

## O que falta (prioridade media)

6. **UX de carregamento por modulo**
   - Skeletons especificos por tela (blog, portfolio, media).

7. **Busca global (Command Palette)**
   - `Ctrl/Cmd + K` para navegar e executar ações.

8. **404 custom + estado sem dados padrao**
   - Pagina 404 com CTA.
   - Empty states consistentes em todos os modulos.

9. **Performance e observabilidade**
   - Telemetria de erros (Sentry ou tabela `app_errors`).
   - Analise de bundle e limites por chunk.

10. **Padrao de provisionamento por cliente**
    - Checklist/shell script para criar instancia white label.
    - Validacoes automaticas de `.env` e schema.

## O que falta (roadmap comercial)

11. **Pacote SEO pro**
    - Redirect manager, sitemap/robots e schema.

12. **Leads e automacoes**
    - Form builder + webhook + integracao CRM.

13. **Relatorios executivos**
    - Relatorio semanal por e-mail com KPI e recomendacoes.

14. **Temas white label avancados**
    - Tokens por cliente (cor, tipografia, espaçamento).

15. **Plano de backup e restauracao**
    - Export/import de conteudo e midia por instancia.
