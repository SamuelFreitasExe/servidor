// netlify/functions/api.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql2 from 'mysql2';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';


// Carregar as variáveis de ambiente
dotenv.config();

// Configuração do caminho atual do arquivo
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Middleware para habilitar CORS, JSON e urlencoded
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Certificar-se de que o diretório de uploads existe
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // Diretório de uploads
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Manter o nome original do arquivo
  }
});

const upload = multer({ storage: storage });

// Conexão com o banco de dados MySQL
const pool = mysql2.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Testar conexão com o banco de dados
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Erro ao conectar no banco de dados:', err);
    process.exit(1);
  }
  console.log('Conectado ao banco de dados MySQL');
  connection.release(); // Liberar a conexão
});

// Endpoint de teste
app.get('/test', (req, res) => {
  res.send('Endpoint está funcionando!');
});

// Endpoint para adicionar uma roupa
app.post('/api/adicionar-roupa', upload.single('foto'), (req, res) => {
  const nome = req.body.nome;
  const foto = req.file ? req.file.filename : null;

  if (!nome || !foto) {
    return res.status(400).json({ message: 'Nome e foto são necessários.' });
  }

  pool.query('INSERT INTO roupas (nome, caminho) VALUES (?, ?)', [nome, foto], (err) => {
    if (err) {
      return res.status(500).json({ message: 'Erro ao adicionar roupa.', error: err });
    }
    res.json({ message: 'Roupa adicionada com sucesso!' });
  });
});

// Endpoint para listar roupas
app.get('/api/roupas', (req, res) => {
  pool.query('SELECT * FROM roupas', (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Erro ao buscar roupas.', error: err });
    }
    res.json(results);
  });
});

// Servir arquivos estáticos (imagens) da pasta "uploads"
app.use('/uploads', express.static(uploadDir));

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

exports.handler = async (event, context) => {
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Hello from Netlify Functions!' }),
    };
  };
  