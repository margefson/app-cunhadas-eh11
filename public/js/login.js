document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const btnCadastrar = document.getElementById("btnCadastrar");

  btnCadastrar.addEventListener("click", () => {
    window.location.href = "cadastro.html";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;

    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha })
      });

      if (!res.ok) throw new Error("Usuário ou senha incorretos");

      const data = await res.json();

      // Salva dados do usuário e token no localStorage
      localStorage.setItem("user", JSON.stringify({
        token: data.token,
        perfil: data.perfil,
        nome_completo: data.nome_completo,
        id: data.id
      }));

      window.location.href = "consulta.html";
    } catch (err) {
      alert(err.message);
    }
  });
});
