# Remix of EngTech Dashboard Hub

Use este código HTML como referência principal da interface.
Recrie este dashboard como um app completo em React, responsivo e profissional.
Mantenha o layout, cores, cards, gráficos, tabelas e organização visual o mais fiel possível.
Converta a estrutura para componentes reutilizáveis.
Crie também:

- tela de login
- dashboard principal
- menu lateral
- páginas internas
- suporte para banco de dados
- preparação para importação de planilhas
- responsividade para desktop e celular
  Aqui está o HTML:

<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EngTech App - V1</title>
  <style>
    :root {
      --green-700:#2e7d32;
      --green-600:#3f9b2f;
      --green-500:#7bc043;
      --green-100:#eff8e8;
      --yellow-500:#f6c338;
      --yellow-100:#fff7dc;
      --blue-700:#23407a;
      --blue-500:#3478c7;
      --slate-900:#0f172a;
      --slate-800:#1e293b;
      --slate-700:#334155;
      --slate-500:#64748b;
      --slate-300:#cbd5e1;
      --slate-200:#e2e8f0;
      --slate-100:#f1f5f9;
      --white:#fff;
      --red-500:#ef4444;
      --amber-500:#f59e0b;
      --shadow:0 16px 45px rgba(15,23,42,.08);
      --radius:24px;
    }
    * { box-sizing:border-box; }
    body {
      margin:0;
      font-family: Inter, "Segoe UI", Arial, sans-serif;
      background: linear-gradient(160deg, #f9fbf7 0%, #eef5ff 100%);
      color:var(--slate-800);
    }
    .app {
      display:grid;
      grid-template-columns: 290px 1fr;
      min-height:100vh;
    }
    .sidebar {
      background: linear-gradient(180deg, #ffffff 0%, #f8fbf5 100%);
      border-right:1px solid rgba(46,125,50,.12);
      padding:24px 18px;
      position:sticky;
      top:0;
      height:100vh;
    }
    .brand {
      display:flex;
      align-items:center;
      gap:14px;
      padding:12px;
      border-radius:22px;
      background: linear-gradient(135deg, rgba(123,192,67,.12), rgba(246,195,56,.10));
      border:1px solid rgba(46,125,50,.10);
    }
    .brand img {
      width:58px; height:58px; border-radius:18px; object-fit:cover;
      box-shadow:0 10px 22px rgba(46,125,50,.18);
      background:#fff;
    }
    .brand h1 {
      font-size:1.2rem; margin:0; color:var(--green-700); line-height:1.05;
    }
    .brand p {
      margin:4px 0 0; font-size:.8rem; color:var(--blue-700); line-height:1.25;
    }
    .nav {
      margin-top:28px;
      display:flex; flex-direction:column; gap:10px;
    }
    .nav button {
      text-align:left; border:none; background:#fff; color:var(--slate-700);
      padding:14px 16px; border-radius:18px; font-weight:600; cursor:pointer;
      box-shadow: 0 8px 24px rgba(15,23,42,.04);
      border:1px solid transparent;
      transition:.2s ease;
    }
    .nav button:hover, .nav button.active {
      background: linear-gradient(135deg, rgba(123,192,67,.18), rgba(246,195,56,.16));
      color:var(--green-700);
      border-color: rgba(63,155,47,.18);
      transform: translateY(-1px);
    }
    .sidebar .hint {
      margin-top:22px; padding:16px; border-radius:20px;
      background: var(--green-100); color:var(--slate-700); font-size:.9rem; line-height:1.45;
    }
    .content { padding:28px; }
    .topbar {
      display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap;
      margin-bottom:24px;
    }
    .hero {
      background:linear-gradient(135deg, rgba(123,192,67,.14), rgba(52,120,199,.08), rgba(246,195,56,.14));
      border:1px solid rgba(46,125,50,.10);
      padding:24px 24px 20px;
      border-radius:30px;
      box-shadow:var(--shadow);
      position:relative;
      overflow:hidden;
    }
    .hero::after {
      content:""; position:absolute; right:-80px; top:-80px; width:220px; height:220px;
      background: radial-gradient(circle, rgba(123,192,67,.15) 0%, rgba(123,192,67,0) 70%);
      border-radius:50%;
    }
    .hero h2 { margin:0; font-size:2rem; color:var(--green-700); }
    .hero p { margin:8px 0 0; color:var(--slate-600, #475569); max-width:720px; line-height:1.55; }
    .controls {
      display:flex; gap:12px; flex-wrap:wrap; align-items:center;
    }
    .input, select {
      background:#fff; border:1px solid var(--slate-200); border-radius:16px; padding:12px 14px;
      font-size:.95rem; min-width:180px; color:var(--slate-700);
      box-shadow:0 8px 20px rgba(15,23,42,.03);
    }
    .btn {
      border:none; border-radius:16px; padding:12px 16px; cursor:pointer; font-weight:700;
      background:linear-gradient(135deg, var(--green-600), var(--green-500));
      color:#fff; box-shadow: 0 12px 24px rgba(63,155,47,.24);
    }
    .btn.secondary {
      background:#fff; color:var(--blue-700); border:1px solid var(--slate-200); box-shadow:none;
    }
    .grid {
      display:grid; gap:18px;
    }
    .kpis {
      grid-template-columns: repeat(4, minmax(0,1fr));
      margin:22px 0;
    }
    .card {
      background:#fff; border-radius:var(--radius); box-shadow:var(--shadow);
      border:1px solid rgba(15,23,42,.05);
      padding:20px;
    }
    .card.kpi {
      position:relative; overflow:hidden;
    }
    .card.kpi::before {
      content:""; position:absolute; inset:auto auto -30px -30px; width:110px; height:110px;
      background: radial-gradient(circle, rgba(123,192,67,.15), transparent 70%);
      border-radius:50%;
    }
    .kpi .label { color:var(--slate-500); font-weight:600; }
    .kpi .value { font-size:2rem; margin-top:8px; font-weight:800; color:var(--slate-900); }
    .kpi .sub { margin-top:6px; font-size:.86rem; color:var(--slate-500); }
    .section-title {
      margin:0 0 14px; font-size:1.1rem; color:var(--slate-800);
    }
    .two {
      grid-template-columns: 1.2fr .8fr;
      margin-bottom:18px;
    }
    .bars { display:flex; flex-direction:column; gap:12px; }
    .bar-row { display:grid; grid-template-columns: 170px 1fr 56px; gap:12px; align-items:center; }
    .track {
      background:var(--slate-100); height:14px; border-radius:999px; overflow:hidden;
    }
    .fill {
      height:100%; border-radius:999px;
      background:linear-gradient(90deg, var(--green-600), var(--yellow-500));
    }
    .mini-grid {
      display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:14px;
    }
    .tag {
      display:inline-flex; align-items:center; padding:6px 10px; border-radius:999px;
      font-size:.78rem; font-weight:700;
    }
    .status-no-prazo { background:#eaf7ed; color:var(--green-700); }
    .status-atrasado { background:#fdecec; color:#b42318; }
    .status-proximo { background:#fff5df; color:#b45309; }
    .status-indeterminado { background:#e8eefb; color:var(--blue-700); }
    table {
      width:100%; border-collapse:collapse; font-size:.94rem;
    }
    th, td { padding:12px 10px; border-bottom:1px solid var(--slate-100); text-align:left; }
    th { color:var(--slate-500); font-size:.8rem; text-transform:uppercase; letter-spacing:.04em; }
    tbody tr:hover { background:#fafdf8; }
    .table-wrap { overflow:auto; max-height:420px; }
    .hidden { display:none !important; }
    .footnote { color:var(--slate-500); font-size:.85rem; margin-top:10px; }
    .empty {
      text-align:center; color:var(--slate-500); padding:26px;
      border:1px dashed var(--slate-200); border-radius:20px; background:var(--slate-100);
    }
    @media (max-width: 1100px) {
      .app { grid-template-columns:1fr; }
      .sidebar { position:relative; height:auto; }
      .kpis, .two { grid-template-columns:1fr; }
    }
    @media (max-width: 700px) {
      .content { padding:18px; }
      .hero h2 { font-size:1.55rem; }
      .kpis { grid-template-columns:1fr 1fr; }
      .mini-grid { grid-template-columns:1fr; }
      .bar-row { grid-template-columns: 110px 1fr 42px; }
    }
 
O app deve se chamar EngTech App

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/46fb68d0-661a-4f2a-a715-07a368eef5c0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
