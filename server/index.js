import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import fs from 'fs-extra';
import { exec } from 'child_process';
import { join, dirname } from 'path';
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;
const BASE_PATH = '/mnt/stgw/SFTP';

// Configuração do logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../static')));

// Função auxiliar para executar comandos shell com sudo
const execSudoCommand = (command) => {
  return new Promise((resolve, reject) => {
    // Usar NOPASSWD sudo para comandos específicos
    exec(`sudo -n ${command}`, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Command failed: ${error.message}\nStderr: ${stderr}`));
        return;
      }
      resolve(stdout);
    });
  });
};

// Criar usuário FTP
app.post('/api/create_user', async (req, res) => {
  try {
    const { username, password, user_folder, write_permission } = req.body;

    if (!username || !password || !user_folder) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios!' });
    }

    // Verificar e corrigir o caminho do diretório
    let userDir = user_folder;
    if (!user_folder.startsWith(BASE_PATH)) {
      userDir = join(BASE_PATH, user_folder.replace(/^\//, ''));
    }

    // Verificar se o diretório existe
    if (!await fs.pathExists(userDir)) {
      return res.status(400).json({ 
        success: false, 
        error: `Diretório ${userDir} não existe.` 
      });
    }

    try {
      // Criar arquivo temporário com as credenciais
      const tempFile = `/tmp/vsftpd_user_${username}`;
      await fs.writeFile(tempFile, `${username}\n${password}\n`);

      // Adicionar usuário ao arquivo de usuários virtuais
      await execSudoCommand(`cat ${tempFile} | tee -a /etc/vsftpd_virtual_users`);

      // Atualizar banco de dados
      await execSudoCommand(`cat ${tempFile} | db_load -T -t hash /etc/vsftpd_virtual_users.db`);

      // Remover arquivo temporário
      await fs.remove(tempFile);

      // Criar configuração do usuário
      const permissions = {
        write_enable: write_permission.toLowerCase() === 'yes' ? 'YES' : 'NO',
        anon_upload_enable: 'YES',
        anon_mkdir_write_enable: 'YES',
        anon_other_write_enable: 'YES'
      };

      const configContent = `local_root=${userDir}\n${
        Object.entries(permissions)
          .map(([key, value]) => `${key}=${value}`)
          .join('\n')
      }`;

      // Criar arquivo de configuração do usuário
      const userConfigFile = `/tmp/vsftpd_conf_${username}`;
      await fs.writeFile(userConfigFile, configContent);
      
      // Mover para o diretório final
      await execSudoCommand(`cat ${userConfigFile} | tee /etc/vsftpd_user_conf/${username}`);
      
      // Remover arquivo temporário
      await fs.remove(userConfigFile);

      // Ajustar permissões
      await execSudoCommand(`chown root:root /etc/vsftpd_user_conf/${username}`);
      await execSudoCommand(`chmod 644 /etc/vsftpd_user_conf/${username}`);

      // Reiniciar serviço vsftpd
      await execSudoCommand('systemctl restart vsftpd');

      res.status(200).json({ 
        success: true, 
        message: `Usuário ${username} criado com sucesso!` 
      });
    } catch (error) {
      logger.error('Erro ao criar usuário:', error);
      res.status(500).json({ 
        success: false, 
        error: `Erro ao criar usuário: ${error.message}` 
      });
    }

  } catch (error) {
    logger.error('Erro ao criar usuário FTP:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Listar diretórios
app.get('/api/list-folders', async (req, res) => {
  try {
    const path = req.query.path || BASE_PATH;

    if (!await fs.pathExists(path)) {
      return res.status(400).json({
        error: `O caminho ${path} não é um diretório válido.`
      });
    }

    const items = await fs.readdir(path);
    const folders = [];

    for (const item of items) {
      const fullPath = join(path, item);
      const stats = await fs.stat(fullPath);
      
      if (stats.isDirectory()) {
        folders.push({
          name: item,
          path: fullPath
        });
      }
    }

    res.status(200).json({
      folders,
      current_path: path
    });

  } catch (error) {
    logger.error('Erro ao listar diretórios:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rota de teste para verificar se o servidor está funcionando
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Rota catch-all para o frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../static/index.html'));
});

// Iniciar servidor
app.listen(port, '0.0.0.0', () => {
  logger.info(`Servidor rodando na porta ${port}`);
});