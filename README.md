# Lamed-beckend

Loja estática da **Seja Profeta** pronta para deploy no **Firebase Hosting**.

## Estrutura
- `index.html`: página principal da loja.
- `app.js`: lógica de catálogo, filtros, carrinho e checkout por WhatsApp.
- `manifest.json`: manifesto PWA básico.
- `firebase.json`: configuração de hosting.
- `.firebaserc`: projeto Firebase padrão (`seja-profeta`).

## Rodar localmente
```bash
python -m http.server 8080
```
Depois, abra `http://localhost:8080` no navegador.

## Publicar no Firebase Hosting
### 1) Instalar Firebase CLI
```bash
npm install -g firebase-tools
```

### 2) Login
```bash
firebase login
```

### 3) Confirmar projeto
```bash
firebase use seja-profeta
```

### 4) Deploy
```bash
firebase deploy --only hosting
```

## Configuração aplicada
- Firebase Web SDK apontando para o projeto `seja-profeta` em `app.js`.
- Busca, filtros por categoria, modal com galeria e carrinho persistente.
- Checkout por WhatsApp com resumo automático do pedido.
- Hosting configurado para servir o diretório raiz com URLs limpas.

## Área Administrativa
- `login-admin.html`: autenticação de administrador com Firebase Auth.
- `dashboard.html`: visão geral com atalhos para módulos do painel.
- Páginas conectadas ao dashboard e já protegidas por login:
  - `produtos.html`
  - `pedidos.html`
  - `chat-admin.html`
  - `galeria.html`
  - `colecoes.html`
  - `editor-imagem.html`
  - `calcularvalordapeça.html`
  - `executor_scripts.html`
- `admin-common.js`: inicialização compartilhada do Firebase + proteção de rota admin.

> Admin travado por UID em `admin-common.js` com: `kTV8LmdqVrZXxE1gYVYxMwFZj9G3`.
