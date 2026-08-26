# HypeMind v0.1 — apresentação

Verificação automática de conformidade · Design Guidelines Hype
Piloto **ITA-CORÁ** (Penha/SC) — sessão assistida (Cowork) e pipeline sobre o
mesmo acervo e o mesmo modelo.

## Ver online

A apresentação é publicada no GitHub Pages a cada push (veja
`.github/workflows/pages.yml`). A URL aparece na aba **Actions**, no resumo do
job de deploy, e em **Settings → Pages**.

## Rodar localmente

O slide do anexo carrega `prompt.txt` via `fetch`, então é preciso servir os
arquivos por HTTP — abrir o `index.html` direto do disco não funciona:

```sh
python3 -m http.server 8000
# http://localhost:8000
```

## Navegação

| Tecla | Ação |
| --- | --- |
| `→` `espaço` `PageDown` | próximo slide |
| `←` `PageUp` | slide anterior |
| `Home` / `End` | primeiro / último slide |
| `G` | índice de slides |
| `N` | notas do apresentador |
| `F` | tela cheia |
| `Esc` | fecha índice e notas |

Cada slide tem endereço próprio: `#1` … `#12`. No toque, deslize para os lados.
Para exportar em PDF, use a impressão do navegador — o `@media print` coloca um
slide por página em 1920×1080.

## Estrutura

```
index.html   os 12 slides, em 1920×1080
deck.css     palco, controles, índice, notas, regras de impressão
deck.js      navegação e as revelações (data-a, data-bar, data-count, …)
prompt.txt   texto do anexo, carregado em runtime
assets/      logotipo, símbolo e grafismo
```

## Pendências

Dois itens do arquivo original não vieram junto e estão preenchidos com
substitutos — troque os arquivos e faça commit, sem mexer no restante:

- `assets/*.svg` — logotipo, símbolo e grafismo são **stand-ins** desenhados na
  paleta da marca (lima `#C5D30D`, grafite `#0F0F0F`), não os arquivos oficiais
  da Hype.
- `prompt.txt` — placeholder; substitua pelo prompt real do pipeline.

As fontes **Ranade** e **Sentient** vêm da Fontshare via CDN. Sem rede, o deck
cai para Helvetica/Georgia e o layout continua de pé.
