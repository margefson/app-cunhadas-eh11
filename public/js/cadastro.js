// cadastro.js

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("cadastroForm");
  const mensagemDiv = document.getElementById("mensagem");

  // Função para exibir mensagens
  function mostrarMensagem(texto, tipo = "erro") {
    mensagemDiv.textContent = texto;
    mensagemDiv.style.color = tipo === "sucesso" ? "green" : "red";
  }

  // Preencher endereço automaticamente via CEP
  const cepInput = form.querySelector('input[name="cep"]');
  cepInput.addEventListener("blur", async () => {
    const cep = cepInput.value.replace(/\D/g, "");
    if (!cep) return;

    //mostrarMensagem("Buscando endereço pelo CEP...", "sucesso");

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) {
        mostrarMensagem("CEP não encontrado");
        return;
      }

      form.querySelector('input[name="logradouro"]').value = data.logradouro || "";
      form.querySelector('input[name="bairro"]').value = data.bairro || "";
      form.querySelector('input[name="cidade"]').value = data.localidade || "";
      form.querySelector('input[name="estado"]').value = data.uf || "";
      //mostrarMensagem("Endereço preenchido automaticamente", "sucesso");
    } catch (err) {
      mostrarMensagem("Erro ao buscar CEP: " + err.message);
    }
  });

  // Enviar formulário
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    mostrarMensagem("");

    const formData = new FormData(form);

    // Validação básica de campos obrigatórios
    const obrigatorios = ["nome_completo", "email", "senha", "data_nascimento", "cep"];
    for (const campo of obrigatorios) {
      if (!formData.get(campo)) {
        mostrarMensagem(`O campo "${campo}" é obrigatório.`);
        return;
      }
    }

    try {
      const res = await fetch("/users", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        // Exibe mensagem detalhada do servidor
        const detalhe = data?.detalhe ? ` - ${data.detalhe}` : "";
        mostrarMensagem(`Erro ao cadastrar${detalhe}`);
        return;
      }

      mostrarMensagem("Cadastro realizado com sucesso!", "sucesso");
      form.reset();
    } catch (err) {
      mostrarMensagem("Erro ao conectar com o servidor: " + err.message);
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const btnVoltar = document.getElementById("btnVoltar");

  if (btnVoltar) {
    btnVoltar.addEventListener("click", () => {
      window.location.href = "index.html"; // ou outra página de destino
    });
  }
});
