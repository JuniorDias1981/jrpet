
    // Estado
    let produtos = [];
    let carrinho = JSON.parse(localStorage.getItem('carrinho') || '[]');
    let bairros = [];

    // Utilidades
    const BRL = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const toNumber = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

    function toast(msg) {
      const c = document.getElementById('toast-container');
      const el = document.createElement('div');
      el.className = 'toast';
      el.textContent = msg;
      c.appendChild(el);
      setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(-6px)'; }, 2200);
      setTimeout(() => el.remove(), 2600);
    }

    function salvarCarrinho() { localStorage.setItem('carrinho', JSON.stringify(carrinho)); }

    // Carregamento de dados
    async function carregarProdutos() {
      try {
        const response = await fetch('data/produtos.json', { cache: 'no-store' });
        if (!response.ok) throw new Error('Falha ao carregar produtos');
        produtos = await response.json();
        filtrarProdutos();
      } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        document.getElementById('produtos-container').innerHTML = '<p>Não foi possível carregar os produtos no momento. Tente novamente mais tarde.</p>';
      }
    }

    async function carregarBairros() {
      try {
        const response = await fetch('data/bairros.json', { cache: 'no-store' });
        if (!response.ok) throw new Error('Falha ao carregar bairros');
        bairros = await response.json();
        preencherBairros();
      } catch (error) {
        console.error('Erro ao carregar bairros:', error);
        toast('Erro ao carregar bairros de entrega.');
      }
    }

    function preencherBairros() {
      const headerSelect = document.getElementById('bairro-select');
      const formSelect = document.getElementById('bairro-form-select');

      const opts = ['<option value="">Selecione</option>']
        .concat(bairros.map(b => `<option value="${b.nome}" data-valor="${b.valor}">${b.nome} - ${BRL(b.valor)}</option>`));

      headerSelect.innerHTML = opts.join('');
      formSelect.innerHTML = opts.join('');

      // restaurar seleção anterior
      const saved = localStorage.getItem('bairro-selecionado') || '';
      if (saved) {
        headerSelect.value = saved;
        formSelect.value = saved;
      }

      atualizarValorEntregaHeader();
    }

    function atualizarValorEntregaHeader() {
      const headerSelect = document.getElementById('bairro-select');
      const span = document.getElementById('valor-entrega-header');
      const valor = toNumber(headerSelect.selectedOptions[0]?.dataset.valor, 0);
      span.textContent = valor > 0 ? `Valor entrega: ${BRL(valor)}` : 'Valor entrega: -';
      atualizarCarrinho();
    }

    // Render de produtos
    function renderizarProdutos(lista) {
      const container = document.getElementById('produtos-container');
      container.innerHTML = '';
      if (!Array.isArray(lista) || lista.length === 0) {
        container.innerHTML = '<p>Nenhum produto encontrado.</p>';
        return;
      }
      lista.forEach((p, i) => {
        const imgPath = p.imagem ? `img/mini/${p.imagem}` : `https://via.placeholder.com/300x200?text=${encodeURIComponent(p.nome)}`;
        const el = document.createElement('div');
        el.className = 'product';
        el.innerHTML = `
          <img src="${imgPath}" alt="${p.nome}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x200?text=${encodeURIComponent(p.nome)}'" />
          <h4>${p.nome}</h4>
          <p class="price">${BRL(p.preco)}</p>
          <button onclick="abrirModalProduto(${i})" aria-label="Ver detalhes de ${p.nome}">Ver detalhes</button>
          <button onclick="adicionarCarrinho(${i})" aria-label="Adicionar ${p.nome} ao carrinho">Adicionar</button>
        `;
        container.appendChild(el);
      });
    }

    // Filtros (com debounce na busca)
    let buscaTimer;
    document.addEventListener('input', (e) => {
      if (e.target.id === 'buscaInput') {
        clearTimeout(buscaTimer);
        buscaTimer = setTimeout(filtrarProdutos, 200);
      }
    });

    function filtrarProdutos() {
      const categoria = document.getElementById('categoriaSelect').value.toLowerCase();
      const busca = document.getElementById('buscaInput').value.toLowerCase().trim();
      const ordenacao = document.getElementById('ordenacaoSelect').value;

      let filtrados = (produtos || []).filter(p => {
        const matchCategoria = (categoria === '' || (p.categoria||'').toLowerCase() === categoria);
        const termo = `${(p.nome||'').toLowerCase()} ${(p.descricao||'').toLowerCase()}`;
        const matchBusca = busca === '' || termo.includes(busca);
        return matchCategoria && matchBusca;
      });

      if (ordenacao === 'nome-asc') filtrados.sort((a,b) => a.nome.localeCompare(b.nome));
      else if (ordenacao === 'nome-desc') filtrados.sort((a,b) => b.nome.localeCompare(a.nome));
      else if (ordenacao === 'preco-asc') filtrados.sort((a,b) => a.preco - b.preco);
      else if (ordenacao === 'preco-desc') filtrados.sort((a,b) => b.preco - a.preco);

      renderizarProdutos(filtrados);
    }

    // Carrossel
    const track = document.getElementById('carousel-track');
    const indicatorsContainer = document.getElementById('carousel-indicators');
    let index = 0; let interval; let autoplay = !matchMedia('(prefers-reduced-motion: reduce)').matches;

    function initCarousel() {
      const totalSlides = track.children.length;
      indicatorsContainer.innerHTML = '';
      for (let i = 0; i < totalSlides; i++) {
        const dot = document.createElement('button');
        dot.addEventListener('click', () => { index = i; updateCarousel(); resetInterval(); });
        indicatorsContainer.appendChild(dot);
      }
      indicatorsContainer.children[0]?.classList.add('active');
      if (autoplay) resetInterval();
    }

    function updateCarousel() {
      const totalSlides = track.children.length;
      track.style.transform = `translateX(-${index * 100}%)`;
      Array.from(indicatorsContainer.children).forEach(d => d.classList.remove('active'));
      indicatorsContainer.children[index]?.classList.add('active');
      if (index >= totalSlides - 1) index = -1; // prepara looping
    }

    function moveCarousel() { index = index + 1; updateCarousel(); }
    function resetInterval() { clearInterval(interval); if (autoplay) interval = setInterval(moveCarousel, 3000); }

    // Carrinho
    function adicionarCarrinho(idx) {
      const produto = produtos[idx];
      if (!produto) return;
      const item = carrinho.find(it => it.produto.nome === produto.nome);
      if (item) item.quantidade++;
      else carrinho.push({ produto, quantidade: 1 });
      toast(`${produto.nome} adicionado ao carrinho!`);
      salvarCarrinho();
      atualizarCarrinho();
    }

    function alterarQuantidade(index, delta) {
      const item = carrinho[index];
      if (!item) return;
      item.quantidade += delta;
      if (item.quantidade <= 0) carrinho.splice(index, 1);
      salvarCarrinho();
      atualizarCarrinho();
    }

    function removerItem(index) { carrinho.splice(index, 1); salvarCarrinho(); atualizarCarrinho(); }

    function atualizarCarrinho() {
      const cartItems = document.getElementById('cart-items');
      const cartTotal = document.getElementById('cart-total');
      const cartCount = document.getElementById('cart-count');
      const headerSelect = document.getElementById('bairro-select');

      cartItems.innerHTML = '';
      let subtotal = 0; let count = 0;

      carrinho.forEach((item, index) => {
        subtotal += item.produto.preco * item.quantidade;
        count += item.quantidade;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
          <div>
            <div class="name">${item.produto.nome}</div>
            <div class="qty-controls" aria-label="Controles de quantidade">
              <button aria-label="Diminuir" onclick="alterarQuantidade(${index}, -1)">-</button>
              <span>x${item.quantidade}</span>
              <button aria-label="Aumentar" onclick="alterarQuantidade(${index}, 1)">+</button>
            </div>
          </div>
          <div>
            <div style="text-align:right; font-weight:700;">${BRL(item.produto.preco * item.quantidade)}</div>
            <button class="remove" aria-label="Remover item" onclick="removerItem(${index})">Remover</button>
          </div>
        `;
        cartItems.appendChild(div);
      });

      const valorEntrega = toNumber(headerSelect.selectedOptions[0]?.dataset.valor, 0);
      const totalFinal = subtotal + valorEntrega;

      // Atualiza totais do modal
      document.getElementById('subtotal-span').textContent = BRL(subtotal);
      document.getElementById('entrega-span').textContent = BRL(valorEntrega);
      document.getElementById('total-span').textContent = BRL(totalFinal);

      // Atualiza botão fixo
      cartTotal.textContent = BRL(totalFinal).replace('R$\u00a0',''); // mostra só número ao lado do ícone
      cartCount.textContent = count;

      if (carrinho.length === 0) {
        cartItems.innerHTML = '<p>Carrinho vazio.</p>';
      }
    }

    function abrirCarrinho() { document.getElementById('cart-modal').style.display = 'block'; }
    function fecharCarrinho() { document.getElementById('cart-modal').style.display = 'none'; }

    function limparCarrinho() {
      if (confirm('Deseja realmente limpar o carrinho?')) {
        carrinho = []; salvarCarrinho(); atualizarCarrinho(); fecharCarrinho();
      }
    }

    function abrirFormulario() {
      fecharCarrinho();
      // sincroniza seleção de bairro no formulário
      const headerSelect = document.getElementById('bairro-select');
      const formSelect = document.getElementById('bairro-form-select');
      formSelect.value = headerSelect.value;
      document.getElementById('formulario-entrega').style.display = 'block';
    }
    function fecharFormulario() { document.getElementById('formulario-entrega').style.display = 'none'; }

    function enviarPedidoWhatsApp() {
      const nome = document.getElementById('nome').value.trim();
      const endereco = document.getElementById('endereco').value.trim();
      const bairro = document.getElementById('bairro-form-select').value.trim();
      const referencia = document.getElementById('referencia').value.trim();
      const pagamento = document.getElementById('pagamento').value;
      const observacoes = document.getElementById('observacoes').value;

      if (!nome || !endereco || !bairro || !pagamento) { toast('Por favor, preencha todos os campos obrigatórios.'); return; }
      if (carrinho.length === 0) { toast('Seu carrinho está vazio.'); return; }

      const valorEntrega = toNumber(bairros.find(b => b.nome === bairro)?.valor, 0);

      let mensagem = `Olá, gostaria fazer um pedido:%0A%0A`;
      carrinho.forEach(item => {
        mensagem += `- ${item.produto.nome} (x${item.quantidade}) - ${BRL(item.produto.preco * item.quantidade)}%0A`;
      });

      let total = carrinho.reduce((acc, item) => acc + item.produto.preco * item.quantidade, 0) + valorEntrega;
      mensagem += `%0AValor entrega: ${BRL(valorEntrega)}`;
      mensagem += `%0ATotal: ${BRL(total)}%0A%0A`;
      mensagem += `Nome: ${nome}%0AEndereço: ${endereco}%0ABairro: ${bairro}%0APonto de referência: ${referencia}%0AForma de Pagamento: ${pagamento}%0AObservações: ${encodeURIComponent(observacoes)}`;
      mensagem += `%0A%0A*Aguarde nosso retorno para confirmar seu pedido.*`;
      const urlWhatsapp = `https://wa.me/5522997407901?text=${mensagem}`;
      const janela = window.open(urlWhatsapp, '_blank');
      if (!janela) { alert('Não foi possível abrir o WhatsApp. Verifique seu bloqueador de pop-ups.'); }

      fecharFormulario();
      carrinho = []; salvarCarrinho(); atualizarCarrinho();
    }

    // Modal Produto
    function abrirModalProduto(index) {
      const produto = produtos[index];
      if (!produto) return;
      const modal = document.getElementById('produto-modal');
      const src = produto.imagem ? `img/${produto.imagem}` : `https://via.placeholder.com/600x400?text=${encodeURIComponent(produto.nome)}`;
      const img = modal.querySelector('img');
      img.src = src; img.alt = produto.nome; img.loading = 'lazy';
      modal.querySelector('h2').textContent = produto.nome;
      modal.querySelector('p').textContent = produto.descricao || '';
      modal.style.display = 'block';
    }
    function fecharModalProduto() { document.getElementById('produto-modal').style.display = 'none'; }

    // Eventos
    document.addEventListener('DOMContentLoaded', () => {
      carregarProdutos();
      carregarBairros();
      initCarousel();

      const headerSelect = document.getElementById('bairro-select');
      const valorEntregaSpan = document.getElementById('valor-entrega-header');

      headerSelect.addEventListener('change', function () {
        const selected = this.value || '';
        localStorage.setItem('bairro-selecionado', selected);
        atualizarValorEntregaHeader();
      });

      // Atualiza UI do carrinho ao iniciar
      atualizarCarrinho();

    });
