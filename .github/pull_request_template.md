## Descrição da Entrega (GitFlow)

Descreva de forma objetiva o que foi alterado ou adicionado nesta branch (`feature/*` → `develop` ou `develop` → `main`).

## Checklist do Portão de Qualidade (Obrigatório antes de ir para `main`)

- [ ] `npm run typecheck` executou com **0 erros** de TypeScript
- [ ] `npm run validate:data` confirmou a integridade dos cubos JSON e das 27 UFs
- [ ] `npm run build` gerou a pasta `dist/` sem erros para deploy na Vercel
- [ ] Testado visualmente no ambiente local (`http://localhost:3000/`)
- [ ] Mantida a separação entre Equipamentos Entregues (`Produto`) e Atendimentos de Adaptação (`Procedimento`)
