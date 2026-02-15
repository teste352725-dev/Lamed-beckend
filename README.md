# Lamed-beckend

Loja estática da **Seja Profeta / Atelier Ferrugem** pronta para deploy no **Firebase Hosting**.

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
