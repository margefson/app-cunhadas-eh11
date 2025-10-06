document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const userNameEl = document.getElementById("userName");
  const logoutBtn = document.getElementById("logoutBtn");
  const buscaInput = document.getElementById("buscaNome");
  const adminFiltro = document.getElementById("adminFiltro");
  const tabelaBody = document.querySelector("#usuariosTable tbody");
  const paginacaoContainer = document.getElementById("paginacaoContainer");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const pageInfo = document.getElementById("pageInfo");

  let usuarios = [];
  let paginaAtual = 1;
  const itensPorPagina = 5;
  const isAdmin = user?.perfil === "admin";

  if (!user || !user.token) {
    window.location.href = "index.html";
    return;
  }

  console.log("👤 Usuário logado:", user);

  userNameEl.textContent = `${user.nome_completo || user.email} (${user.perfil})`;

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("user");
    window.location.href = "index.html";
  });

  if (!isAdmin) {
    adminFiltro.style.display = "none";
    paginacaoContainer.style.display = "none";
  }

  buscaInput.addEventListener("input", () => {
    paginaAtual = 1;
    renderTabela(filtrarUsuarios());
  });

  prevPageBtn.addEventListener("click", () => {
    if (paginaAtual > 1) {
      paginaAtual--;
      renderTabela(filtrarUsuarios());
    }
  });

  nextPageBtn.addEventListener("click", () => {
    const totalPaginas = Math.ceil(filtrarUsuarios().length / itensPorPagina);
    if (paginaAtual < totalPaginas) {
      paginaAtual++;
      renderTabela(filtrarUsuarios());
    }
  });

  async function carregarUsuarios() {
    try {
      const resp = await fetch("/users", {
        headers: { Authorization: "Bearer " + user.token },
      });

      if (!resp.ok) throw new Error("Erro ao buscar usuários.");
      usuarios = await resp.json();
      console.log("📦 Usuários carregados:", usuarios);
      renderTabela(usuarios);
    } catch (error) {
      console.error("❌ Erro ao carregar usuários:", error);
      alert("Erro ao carregar usuários.");
    }
  }

  function filtrarUsuarios() {
    const termo = buscaInput.value.toLowerCase();
    return usuarios.filter((u) => u.nome_completo?.toLowerCase().includes(termo));
  }

  function formatarData(dataISO) {
    if (!dataISO) return "";
    const d = new Date(dataISO);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  }

  function renderTabela(lista) {
    tabelaBody.innerHTML = "";
    let pagina = lista;

    if (isAdmin) {
      const inicio = (paginaAtual - 1) * itensPorPagina;
      const fim = inicio + itensPorPagina;
      pagina = lista.slice(inicio, fim);
    }

    if (pagina.length === 0) {
      tabelaBody.innerHTML = `<tr><td colspan="12" style="text-align:center;">Nenhum usuário encontrado</td></tr>`;
      pageInfo.textContent = isAdmin ? "Página 0 de 0" : "";
      return;
    }

    console.log("🎨 Renderizando tabela. Admin:", isAdmin);

    for (const u of pagina) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${u.id}</td>
        <td>${u.nome_completo || ""}</td>
        <td>${u.email}</td>
        <td>${formatarData(u.data_nascimento)}</td>
        <td>${u.endereco?.cep || ""}</td>
        <td>${u.endereco?.logradouro || ""}</td>
        <td>${u.endereco?.bairro || ""}</td>
        <td>${u.endereco?.cidade || ""}</td>
        <td>${u.endereco?.estado || ""}</td>
        <td>${u.cunhado || ""}</td>
        <td>${u.foto_url ? `<img src="${u.foto_url}" alt="foto" class="foto-thumb">` : "—"}</td>
        <td>
          <button class="editarBtn" data-id="${u.id}">✏️ Editar</button>
          ${isAdmin ? `<button class="excluirBtn" data-id="${u.id}">🗑️ Excluir</button>` : ""}
        </td>
      `;
      tabelaBody.appendChild(tr);
    }

    if (isAdmin) {
      const totalPaginas = Math.ceil(lista.length / itensPorPagina);
      pageInfo.textContent = `Página ${paginaAtual} de ${totalPaginas}`;
    }

    document.querySelectorAll(".editarBtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        window.location.href = `edicao.html?id=${btn.dataset.id}`;
      });
    });

    document.querySelectorAll(".excluirBtn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = parseInt(btn.dataset.id);
        if (id === user.id) {
          alert("⚠️ Você não pode excluir seu próprio usuário!");
          return;
        }

        if (!confirm("Tem certeza que deseja excluir este usuário?")) return;

        try {
          const resp = await fetch(`/users/${id}`, {
            method: "DELETE",
            headers: { Authorization: "Bearer " + user.token },
          });

          if (!resp.ok) {
            const err = await resp.json();
            alert("Erro ao excluir: " + (err.erro || "Falha desconhecida"));
            return;
          }

          alert("✅ Usuário excluído com sucesso!");
          carregarUsuarios();
        } catch (err) {
          console.error("Erro ao excluir:", err);
          alert("Erro ao excluir usuário.");
        }
      });
    });

    document.querySelectorAll(".foto-thumb").forEach((img) => {
      img.addEventListener("click", () => {
        const modal = document.createElement("div");
        modal.className = "modal-foto";
        const imgModal = document.createElement("img");
        imgModal.src = img.src;
        modal.appendChild(imgModal);
        modal.addEventListener("click", () => modal.remove());
        document.body.appendChild(modal);
      });
    });
  }

  carregarUsuarios();
});
