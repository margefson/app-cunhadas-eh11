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

  // 🚪 Verifica login
  if (!user || !user.token) {
    window.location.href = "index.html";
    return;
  }

  userNameEl.textContent = `${user.nome_completo || user.email} (${user.perfil})`;

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("user");
    localStorage.removeItem("editUserId");
    window.location.href = "index.html";
  });

  if (user.perfil !== "admin") {
    adminFiltro.style.display = "none";
    paginacaoContainer.style.display = "none";
  }

  buscaInput.addEventListener("input", () => {
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

      // Certifica que endereco é objeto
      usuarios = usuarios.map(u => ({
        ...u,
        endereco: typeof u.endereco === "string" ? JSON.parse(u.endereco) : u.endereco
      }));

      renderTabela(usuarios);
    } catch (err) {
      console.error(err);
      alert("Erro ao carregar usuários.");
    }
  }

  function filtrarUsuarios() {
    const termo = buscaInput.value.toLowerCase();
    return usuarios.filter(u => u.nome_completo?.toLowerCase().includes(termo));
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

    if (user.perfil === "admin") {
      const inicio = (paginaAtual - 1) * itensPorPagina;
      const fim = inicio + itensPorPagina;
      pagina = lista.slice(inicio, fim);
    }

    if (pagina.length === 0) {
      tabelaBody.innerHTML = `<tr><td colspan="9" style="text-align:center;">Nenhum usuário encontrado</td></tr>`;
      pageInfo.textContent = user.perfil === "admin" ? `Página 0 de 0` : "";
      return;
    }

    for (const u of pagina) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${u.id}</td>
        <td>${u.nome_completo || ""}</td>
        <td>${u.email || ""}</td>
        <td>${formatarData(u.data_nascimento)}</td>
        <td>${u.endereco?.logradouro || ""}</td>
        <td>${u.endereco?.bairro || ""}</td>
        <td>${u.endereco?.cidade || ""}</td>
        <td>${u.endereco?.estado || ""}</td>
        <td>${u.cunhado || ""}</td>
        <td>${u.foto_url ? `<img src="${u.foto_url}" class="foto-thumb">` : "—"}</td>
        <td><button class="editarBtn btn-verde" data-id="${u.id}">Editar</button></td>
      `;
      tabelaBody.appendChild(tr);
    }

    if (user.perfil === "admin") {
      const totalPaginas = Math.ceil(lista.length / itensPorPagina);
      pageInfo.textContent = `Página ${paginaAtual} de ${totalPaginas}`;
    } else {
      pageInfo.textContent = "";
    }

    // Evento editar
    document.querySelectorAll(".editarBtn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        window.location.href = `edicao.html?id=${id}`;
      });
    });

    // Evento preview foto
    document.querySelectorAll(".foto-thumb").forEach(img => {
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
