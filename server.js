import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

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

// Configuração do cliente Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuração do multer para uploads em memória
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Endpoint de teste
app.get('/test', (req, res) => {
  res.send('Endpoint está funcionando!');
});

// Endpoint para adicionar uma roupa
app.post('/api/adicionar-roupa', upload.single('foto'), async (req, res) => {
  const { nome, preco } = req.body;
  const foto = req.file;

  if (!nome || !preco || !foto) {
    return res.status(400).json({ message: 'Nome, preço e foto são necessários.' });
  }

  try {
    // Upload da imagem no Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('roupas') // Nome do bucket no Supabase
      .upload(`fotos/${Date.now()}_${foto.originalname}`, foto.buffer, {
        contentType: foto.mimetype,
      });

    if (uploadError) {
      throw uploadError;
    }

    // URL pública do arquivo
    const fotoUrl = `${supabase.storage.from('roupas').getPublicUrl(uploadData.path).data.publicUrl}`;

    // Inserir os dados no banco
    const { error: insertError } = await supabase
      .from('roupas') // Nome da tabela
      .insert([{ nome, preco, caminho: fotoUrl }]);

    if (insertError) {
      throw insertError;
    }

    res.json({ message: 'Roupa adicionada com sucesso!', fotoUrl });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao adicionar roupa.', error });
  }
});

// Endpoint para listar roupas
app.get('/api/roupas', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('roupas') // Nome da tabela
      .select('*');

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar roupas.', error });
  }
});

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
