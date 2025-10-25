// app.js - front-end logic simples
(function(){
  const btns = document.querySelectorAll('.seg');
  const chartImg = document.getElementById('chart-img');

  btns.forEach(b => {
    b.addEventListener('click', async () => {
      btns.forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      const range = b.dataset.range;
      // trocar a imagem do chart (cache bust)
      chartImg.src = `/chart?range=${range}&t=${Date.now()}`;
      // atualizar os cards (consumir /api/sales para sumarizar)
      try {
        const r = await fetch(`/api/sales?range=${range}`);
        const j = await r.json();
        // Exemplo: atualizar os campos com métricas simples
        const total = j.values.reduce((s,v)=>s+v,0);
        document.getElementById('low-count').textContent = Math.max(0, Math.round(total/1000));
        document.getElementById('qty-count').textContent = j.values.reduce((s,v)=>s+s+0,0) ? j.values.length*10 : 0; // placeholder
        document.getElementById('cost-total').textContent = `R$ ${total.toLocaleString()}`;
      } catch(e){
        console.warn('Erro ao buscar dados', e);
      }
    });
  });
})();