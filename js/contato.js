
    function enviarWhatsApp() {
      const nome = document.getElementById("nome").value;
      const telefone = document.getElementById("telefone").value;
      const email = document.getElementById("email").value;
      const mensagem = document.getElementById("mensagem").value;

      const texto = `📬 Novo contato do site JR Pet` +
                    `👤 Nome: ${nome}%0A` +
                    `📞 Telefone: ${telefone}%0A` +
                    `✉️ Email: ${email}%0A` +
                    `💬 Mensagem: ${mensagem}`;

      const url = `https://wa.me/5522997407901?text=${texto}`;
      window.open(url, "_blank");

    }

