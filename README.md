# Lamed-beckend

Loja estática da **Seja Profeta / Atelier Ferrugem** pronta para deploy.

## Estrutura
- `index.html`: página principal da loja.
- `app.js`: lógica de catálogo, filtros, carrinho e checkout por WhatsApp.

## Como executar localmente
```bash
python -m http.server 8080
```
Depois, abra `http://localhost:8080` no navegador.

## Configuração já aplicada
- Firebase configurado para o projeto `seja-profeta` no `app.js`.
- Busca, filtros por categoria, modal com galeria e carrinho persistente.
- Checkout direcionado para WhatsApp com resumo do pedido.
