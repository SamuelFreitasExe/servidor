import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv'; // Adicionar esta linha

dotenv.config(); // Carregar as variáveis de ambiente

// Configurações do Supabase
const supabaseUrl = process.env.SUPABASE_URL; // Atribuindo as variáveis de ambiente
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const port = 3000;

// Habilitando CORS para todas as origens
app.use(cors()); // Permite requisições de qualquer origem

app.use(express.json());

// Configuração do multer para armazenar imagens na memória
const storage = multer.memoryStorage(); // Usando memória em vez de armazenamento local
const upload = multer({ storage: storage });

// Rota para adicionar produto
app.post('/api/products', upload.single('foto'), async (req, res) => {
  try {
    const { name, description, price, stock, season } = req.body;
    const file = req.file;

    console.log('Arquivo recebido:', file);
    console.log('Dados do produto:', req.body);  // Aqui você deve ver os dados corretamente

    // Validar se o arquivo foi enviado
    if (!file || !file.buffer) {
      return res.status(400).json({ message: 'A foto do produto é obrigatória ou está inválida.' });
    }

    // Gerar um nome único para o arquivo
    const fileName = `products/${Date.now()}-${file.originalname}`;

    // Fazer o upload para o Supabase Storage
    const { data, error } = await supabase.storage
      .from('collections')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      console.error('Erro ao fazer upload:', error);
      return res.status(400).json({ message: 'Erro ao enviar a imagem para o Supabase Storage', error });
    }

    const fullPath =`${supabaseUrl}/storage/v1/object/public/collections/${data.path}`;

    if (!data || !data.path) {
      return res.status(400).json({ message: 'Erro ao obter o caminho da imagem no Supabase' });
    }

    // Inserir o produto na tabela "products"
    const { data: productData, error: productError } = await supabase
      .from('products')
      .insert([
        {
          name,
          description,
          price: parseFloat(price),  // Garantir que price é um número
          stock: parseInt(stock, 10),  // Garantir que stock é um número inteiro
          season,
          image_path: fileName,
          image_url: fullPath,
          created_at: new Date(),
        },
      ]);

    if (productError) {
      console.error('Erro ao salvar produto na tabela:', productError);
      return res.status(400).json({ message: 'Erro ao salvar produto na tabela', error: productError });
    }

    // Certifique-se de que os dados do produto estão sendo retornados corretamente
    res.status(201).json({
      message: 'Produto adicionado com sucesso!',
      product: productData,
      imageDetails: { fullPath, path: data.path },
    });
  } catch (error) {
    console.error('Erro interno do servidor:', error);
    return res.status(500).json({ message: 'Erro interno do servidor', error });
  }
});
// Rota para listar produtos
app.get('/api/products', async (req, res) => {
  try {
    // Buscar os produtos na tabela 'products' do Supabase
    const { data, error } = await supabase.from('products').select('*');
    if (error) {
      console.error('Erro ao carregar produtos:', error);
      return res.status(400).json({ message: 'Erro ao carregar produtos', error });
    }
    if (data.length === 0) {
      return res.status(200).json({ message: 'Nenhum produto encontrado' });
    }
    // Retorna os produtos em formato JSON
    res.status(200).json({ products: data });
  } catch (error) {
    console.error('Erro interno do servidor:', error);
    return res.status(500).json({ message: 'Erro interno do servidor', error });
  }
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});