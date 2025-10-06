document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("edicaoForm");
  const fotoInput = document.getElementById("foto");
  const fotoPreview = document.getElementById("fotoPreview");
  const btnVoltar = document.getElementById("btnVoltar");
  const btnSair = document.getElementById("btnSair");

  // Pega id do query string ou fallback localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get("id") || localStorage.getItem("editUserId");

  if (!userId) {
    alert("Nenhum usuário selecionado para edição.");
    window.location.href = "consulta.html";
    return;
  }

  // Formata data para yyyy-MM-dd (input date)
  const formatarDataInput = (dataISO) => {
    if (!dataISO) return "";
    const d = new Date(dataISO);
    if (isNaN(d)) return "";
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  };

  // Buscar usuário
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    const resp = await fetch(`/users/${userId}`, {
      headers: { Authorization: `Bearer ${user.token}` },
    });
    if (!resp.ok) throw new Error("Erro ao carregar dados do usuário");
    const u = await resp.json();

    document.getElementById("nome").value = u.nome_completo || "";
    document.getElementById("email").value = u.email || "";
    document.getElementById("data_nascimento").value = formatarDataInput(u.data_nascimento);
    document.getElementById("logradouro").value = u.endereco?.logradouro || "";
    document.getElementById("bairro").value = u.endereco?.bairro || "";
    document.getElementById("cidade").value = u.endereco?.cidade || "";
    document.getElementById("estado").value = u.endereco?.estado || "";
    document.getElementById("cep").value = u.endereco?.cep || "";
    document.getElementById("numero").value = u.numero || "";
    document.getElementById("complemento").value = u.complemento || "";
    document.getElementById("cunhado").value = u.cunhado || "";

    if (u.foto_url) {
      fotoPreview.src = u.foto_url;
      fotoPreview.style.display = "block";
    }
  } catch (err) {
    console.error(err);
    alert("Falha ao carregar informações do usuário.");
  }

  // Preview da nova foto
  if (fotoInput) {
    fotoInput.addEventListener("change", e => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          fotoPreview.src = reader.result;
          fotoPreview.style.display = "block";
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Submit do form
  if (form) {
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const formData = new FormData(form);

      try {
        const user = JSON.parse(localStorage.getItem("user"));
        const resp = await fetch(`/users/${userId}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${user.token}` },
          body: formData,
        });
        if (!resp.ok) throw new Error("Erro ao atualizar usuário");

        alert("Usuário atualizado com sucesso!");
        window.location.href = "consulta.html";
      } catch (err) {
        console.error(err);
        alert("Erro ao atualizar usuário. Verifique os dados e tente novamente.");
      }
    });
  }

  // Botão voltar
  if (btnVoltar) {
    btnVoltar.addEventListener("click", () => {
      window.location.href = "consulta.html";
    });
  }

  // Botão sair
  if (btnSair) {
    btnSair.addEventListener("click", () => {
      if (confirm("Deseja realmente sair?")) {
        localStorage.removeItem("user");
        window.location.href = "index.html";
      }
    });
  }
});
