# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Testes unitários do IFPASS

Use Node.js 22.12+ na linha 22 ou Node.js 24 LTS.

```bash
npm ci
npm run test
npm run test:watch
```

`npm run test` executa a suíte uma vez. `npm run test:watch` reexecuta os testes quando arquivos mudam. Use `Ctrl+C` para sair.

A suíte usa Vitest em ambiente Node e verifica a correção de simulados com dados sintéticos e a integridade do catálogo e da classificação oficiais. As contagens do catálogo refletem as provas versionadas e devem ser revisadas ao adicionar uma prova oficial. Os testes rodam sem credenciais ou conexão com o Supabase.

Execute também `npm run lint` e `npm run build` antes de concluir uma implementação.
