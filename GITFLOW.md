# Estrutura GitFlow do Projeto (`tech_assistiva`)

Este repositório segue o fluxo **GitFlow** para garantir que a branch `main` (conectada ao ambiente de **Produção na Vercel**) receba apenas versões testadas, tipadas e aprovadas.

---

## 1. Estrutura de Branches

| Branch | Papel no Sistema | Ambiente Vercel |
| :--- | :--- | :--- |
| **`main`** | **Produção Estável** — Só recebe código vindo de `develop` (ou `hotfix/*`) após passar no Quality Gate (`npm run validate`). | **Production** (URL oficial) |
| **`develop`** | **Desenvolvimento e Homologação** — Branch padrão de trabalho onde novas melhorias são integradas e testadas. | **Preview / Staging** (URL de teste automática) |
| **`feature/<nome>`** | **Novas Funcionalidades** — Criadas a partir de `develop` (ex.: `feature/filtro-municipal`) e mescladas de volta em `develop`. | **Preview Deployment** |
| **`hotfix/<nome>`** | **Correções Urgentes** — Criadas a partir de `main` para corrigir problemas críticos e mescladas em `main` e `develop`. | **Preview Deployment** |

---

## 2. Fluxo de Trabalho no Dia a Dia

### A. Desenvolvendo no ambiente de homologação (`develop`)
Todo trabalho diário ocorre na branch `develop` (ou em uma branch `feature/*` derivada dela):
```bash
git checkout develop
# Faça as alterações nos arquivos...
npm run validate
git add .
git commit -m "feat: descricao da melhoria"
git push origin develop
```
> Ao dar `git push origin develop`, a **Vercel** gera automaticamente um link de **Preview (Homologação)** e o **GitHub Actions** executa o workflow `GitFlow Quality Gate (CI)`.

### B. Promovendo para Produção (`develop` → `main`)
Quando tudo estiver validado em `develop` e aprovado para ir ao ar na `main`:

**Opção 1 — Comando Automatizado com Trava de Segurança:**
```bash
npm run flow:promote-main
```
*(Esse comando executa automaticamente `tsc --noEmit`, valida a integridade dos dados JSON das 27 UFs, testa o `vite build`, faz o merge de `develop` em `main`, envia para o GitHub `origin/main` e já devolve seu terminal para a branch `develop`!)*

**Opção 2 — Via Pull Request no GitHub:**
1. Abra um Pull Request de `develop` para `main` em `https://github.com/jhonferreira17/tech_assistiva/pulls`.
2. Aguarde o check verde do **GitFlow Quality Gate (CI)**.
3. Clique em **Merge pull request**.
