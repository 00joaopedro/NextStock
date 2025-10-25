// server.js
const express = require('express');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// --- Simula dados de vendas (últimos 365 dias) ---
const sales = generateSampleSales(365);

function generateSampleSales(days) {
  const now = Date.now();
  const arr = [];
  for (let i = 0; i < days; i++) {
    // 0..days-1: dia i atrás
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    // valor aleatório entre 0 e 1000
    const total = Math.round(Math.max(0, (Math.sin(i / 5) + 1.5) * 100 + Math.random() * 300));
    arr.push({ date: date.toISOString(), total });
  }
  return arr;
}

// --- Helpers de agregação ---
function aggregate(range) {
  const now = new Date();
  if (range === 'day') {
    // últimos 24h -> buckets por hora
    const buckets = Array.from({ length: 24 }, () => 0);
    const labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    const cutoff = new Date(now - 24 * 60 * 60 * 1000);
    // usamos sales por dia, para simular dividimos o valor do dia pelas 24h aleatoriamente
    for (const s of sales) {
      const d = new Date(s.date);
      if (d >= cutoff) {
        // adicionar ao bucket da hora (usando hora do dia)
        const hour = d.getHours();
        buckets[hour] += s.total;
      }
    }
    return { labels, values: buckets.map(v => Math.round(v)) };
  }

  if (range === 'week') {
    // últimos 7 dias -> buckets por dia
    const buckets = Array.from({ length: 7 }, () => 0);
    const labels = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      labels.push(d.toLocaleDateString(undefined, { weekday: 'short' }));
    }
    const cutoff = new Date(now - 7 * 24 * 60 * 60 * 1000);
    for (const s of sales) {
      const d = new Date(s.date);
      if (d >= cutoff) {
        const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
        const idx = 6 - diffDays; // 0..6
        if (idx >= 0 && idx < 7) buckets[idx] += s.total;
      }
    }
    return { labels, values: buckets.map(v => Math.round(v)) };
  }

  if (range === 'month') {
    // últimos 30 dias -> buckets por dia (1..30)
    const len = 30;
    const buckets = Array.from({ length: len }, () => 0);
    const labels = [];
    for (let i = len - 1; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      labels.push(String(d.getDate()));
    }
    const cutoff = new Date(now - len * 24 * 60 * 60 * 1000);
    for (const s of sales) {
      const d = new Date(s.date);
      if (d >= cutoff) {
        const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
        const idx = (len - 1) - diffDays;
        if (idx >= 0 && idx < len) buckets[idx] += s.total;
      }
    }
    return { labels, values: buckets.map(v => Math.round(v)) };
  }

  // year: últimos 12 meses -> buckets por mês
  if (range === 'year') {
    const buckets = Array.from({ length: 12 }, () => 0);
    const labels = [];
    const nowMonth = now.getMonth();
    for (let m = 0; m < 12; m++) {
      const d = new Date(now.getFullYear(), nowMonth - (11 - m), 1);
      labels.push(d.toLocaleDateString(undefined, { month: 'short' }));
    }
    const cutoff = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    for (const s of sales) {
      const d = new Date(s.date);
      if (d >= cutoff) {
        const monthDiff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
        const idx = 11 - monthDiff;
        if (idx >= 0 && idx < 12) buckets[idx] += s.total;
      }
    }
    return { labels, values: buckets.map(v => Math.round(v)) };
  }

  // default
  return aggregate('week');
}

// API: retorna dados JSON agregados
app.get('/api/sales', (req, res) => {
  const range = (req.query.range || 'week').toLowerCase();
  const data = aggregate(range);
  res.json({ range, labels: data.labels, values: data.values });
});

// Chart endpoint: gera PNG via SVG + Sharp
app.get('/chart', async (req, res) => {
  const range = (req.query.range || 'week').toLowerCase();
  const { labels, values } = aggregate(range);

  // Gera SVG do gráfico de barras (torres)
  const w = 1000;
  const h = 400;
  const padding = { top: 30, right: 20, bottom: 60, left: 60 };
  const innerW = w - padding.left - padding.right;
  const innerH = h - padding.top - padding.bottom;
  const maxVal = Math.max(...values, 1);
  const barGap = 8;
  const barWidth = Math.max(6, (innerW / values.length) - barGap);

  // build SVG bars
  let barsSvg = '';
  values.forEach((v, i) => {
    const x = padding.left + i * (barWidth + barGap);
    const barH = (v / maxVal) * (innerH - 20);
    const y = padding.top + (innerH - barH);
    barsSvg += `
      <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="4" ry="4" fill="url(#g)"/>
      <text x="${x + barWidth/2}" y="${h - 18}" font-size="12" text-anchor="middle" fill="#333">${escapeXml(String(labels[i]))}</text>
    `;
  });

  const svg = `
  <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#00d4ff"/>
        <stop offset="100%" stop-color="#0b2545"/>
      </linearGradient>
      <style>
        .title { font: 18px sans-serif; fill: #01202a; }
        .label { font: 12px sans-serif; fill: #333; }
      </style>
    </defs>
    <rect width="100%" height="100%" fill="#ffffff" rx="8" />
    <text x="${padding.left}" y="22" class="title">Vendas - ${range.toUpperCase()}</text>

    <!-- Y axis labels -->
    ${[0,0.25,0.5,0.75,1].map(fr => {
      const val = Math.round(maxVal * (1 - fr));
      const y = padding.top + fr * (innerH - 20);
      return `<text x="${padding.left - 10}" y="${y+4}" font-size="12" text-anchor="end" fill="#666">${val}</text>
              <line x1="${padding.left}" y1="${y}" x2="${w - padding.right}" y2="${y}" stroke="#eee" stroke-width="1"/>`;
    }).join('')}

    ${barsSvg}
  </svg>
  `;

  try {
    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
    res.set('Content-Type', 'image/png');
    res.send(pngBuffer);
  } catch (err) {
    console.error('Erro ao renderizar gráfico:', err);
    res.status(500).send('Erro ao gerar gráfico');
  }
});

function escapeXml(s){
  return s.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]);
}

app.listen(PORT, () => {
  console.log(`Server rodando em http://localhost:${PORT}`);
});