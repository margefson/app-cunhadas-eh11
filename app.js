import dotenv from "dotenv";
dotenv.config(); // ⚠️ precisa estar antes de importar s3

import express from "express";
import { uploadToS3, initS3 } from "./s3.js";

const BUCKET = initS3(); // inicializa S3 depois do dotenv


import multer from "multer";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";
import fs from "fs";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔹 Caminhos absolutos
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔹 Conexão com PostgreSQL
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

// 🔹 Middleware JWT
function autenticarToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// 🔹 Servir arquivos estáticos
app.use(express.static(path.join(__dirname, "public")));

// Serve a pasta uploads dentro do public
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// 🔹 Página inicial (login)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 🔹 Cadastro de usuário
app.post("/users", upload.single("foto"), async (req, res) => {
  const {
    nome_completo,
    email,
    senha,
    data_nascimento,
    logradouro,
    bairro,
    cidade,
    estado,
    cep,
    numero,
    complemento,
    cunhado,
    perfil
  } = req.body;

  try {
    if (!nome_completo || !email || !senha || !data_nascimento || !cep) {
      return res.status(400).json({ erro: "Campos obrigatórios não preenchidos" });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    let foto_url = null;
    if (req.file) {
      foto_url = await uploadToS3(req.file);
    }

    const endereco = { cep, logradouro, bairro, cidade, estado };

    const result = await pool.query(
      `INSERT INTO users 
       (nome_completo, email, senha, data_nascimento, endereco, numero, complemento, cunhado, foto_url, perfil)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10)
       RETURNING id, perfil`,
      [
        nome_completo,
        email,
        senhaHash,
        data_nascimento,
        JSON.stringify(endereco),
        numero,
        complemento || null,
        cunhado,
        foto_url,
        perfil || "usuario"
      ]
    );

    res.status(201).json({ id: result.rows[0].id, perfil: result.rows[0].perfil });
  } catch (err) {
    console.error("❌ Erro ao salvar usuário:", err);
    res.status(500).json({ 
        erro: "Erro ao salvar no banco de dados", 
        detalhe: err.message,
        stack: err.stack
    });
  }
});

// 🔹 Login
app.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rowCount === 0) return res.status(401).json({ erro: "Usuário não encontrado" });

    const user = result.rows[0];
    const senhaValida = await bcrypt.compare(senha, user.senha);
    if (!senhaValida) return res.status(401).json({ erro: "Senha incorreta" });

    const token = jwt.sign(
      { id: user.id, perfil: user.perfil, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    // Retornar também nome_completo e id
    res.json({ 
      token, 
      perfil: user.perfil, 
      nome_completo: user.nome_completo,
      id: user.id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro no login" });
  }
});


// 🔹 Atualizar usuário
app.put("/users/:id", autenticarToken, upload.single("foto"), async (req, res) => {
  const { id } = req.params;

  if (req.user.perfil !== "admin" && req.user.id != id)
    return res.status(403).json({ erro: "Acesso negado" });

  const {
    nome_completo,
    data_nascimento,
    logradouro,
    bairro,
    cidade,
    estado,
    cep,
    numero,
    complemento,
    cunhado
  } = req.body;

  if (!nome_completo || !data_nascimento || !cep) {
    return res.status(400).json({ erro: "Campos obrigatórios não preenchidos" });
  }

  try {
    const endereco = { cep, logradouro, bairro, cidade, estado };
    let foto_url = null;
    if (req.file) {
      foto_url = await uploadToS3(req.file); // envia para S3
    }

    await pool.query(
      `UPDATE users
       SET nome_completo=$1,
           data_nascimento=$2,
           endereco=$3::jsonb,
           numero=$4,
           complemento=$5,
           cunhado=$6,
           foto_url=COALESCE($7, foto_url)
       WHERE id=$8`,
      [
        nome_completo,
        data_nascimento,
        JSON.stringify(endereco),
        numero,
        complemento || null,
        cunhado,
        foto_url,
        id
      ]
    );

    res.json({ mensagem: "Usuário atualizado com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao atualizar usuário", detalhe: err.message });
  }
});

// GET /users/:id - retorna um usuário específico
app.get("/users/:id", autenticarToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "SELECT id, nome_completo, email, data_nascimento, endereco, numero, complemento, cunhado, foto_url, perfil FROM users WHERE id = $1",
      [id]
    );

    if (result.rowCount === 0) return res.status(404).json({ erro: "Usuário não encontrado" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar usuário" });
  }
});

// GET /users - retorna todos os usuários (admin) ou próprio usuário
app.get("/users", autenticarToken, async (req, res) => {
  try {
    let result;
    if (req.user.perfil === "admin") {
      result = await pool.query(
        "SELECT id, nome_completo, email, data_nascimento, endereco, numero, complemento, cunhado, foto_url, perfil FROM users ORDER BY id ASC"
      );
    } else {
      result = await pool.query(
        "SELECT id, nome_completo, email, data_nascimento, endereco, numero, complemento, cunhado, foto_url, perfil FROM users WHERE id = $1",
        [req.user.id]
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar usuários" });
  }
});


// 🔹 Inicializar servidor e criar admin padrão
const PORT = process.env.PORT || 3000;

async function criarAdminSeNaoExistir() {
  try {
    const adminCheck = await pool.query("SELECT id FROM users WHERE perfil = 'admin' LIMIT 1");
    if (adminCheck.rowCount === 0) {
      console.log("🔧 Criando administrador padrão...");

      const senhaHash = await bcrypt.hash("admin123", 10);
      await pool.query(
        `INSERT INTO users 
         (nome_completo, email, senha, data_nascimento, endereco, numero, complemento, cunhado, foto_url, perfil)
         VALUES 
         ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10)`,
        [
          "Administrador do Sistema",
          "admin@cunhadas.com",
          senhaHash,
          "1990-01-01",
          JSON.stringify({
            cep: "00000000",
            logradouro: "Rua Principal",
            bairro: "Centro",
            cidade: "Manaus",
            estado: "AM"
          }),
          "100",
          null,
          "N/A",
          null,
          "admin"
        ]
      );

      console.log("✅ Admin padrão criado:");
      console.log("   Email: admin@cunhadas.com");
      console.log("   Senha: admin123");
    } else {
      console.log("✅ Administrador já existente.");
    }
  } catch (err) {
    console.error("❌ Erro ao criar admin:", err);
  }
}

app.listen(PORT, async () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  await criarAdminSeNaoExistir();
});
