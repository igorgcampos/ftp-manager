#!/bin/bash

# Diretório de destino no servidor
DEPLOY_DIR="/opt/ftp_manager"
APP_DIR="$DEPLOY_DIR/app"
BACKEND_DIR="$APP_DIR/server"
FRONTEND_DIR="$APP_DIR/static"

# Criar diretórios necessários
sudo mkdir -p $BACKEND_DIR $FRONTEND_DIR

# Copiar arquivos do backend
sudo cp -r server/* $BACKEND_DIR/
sudo cp package.json $APP_DIR/

# Copiar arquivos do frontend buildado
sudo cp -r dist/* $FRONTEND_DIR/

# Instalar dependências
cd $APP_DIR
sudo npm install --production

# Configurar permissões
sudo chown -R www-data:www-data $APP_DIR
sudo chmod -R 755 $APP_DIR

# Criar arquivo de serviço systemd
sudo tee /etc/systemd/system/ftp-manager.service << EOF
[Unit]
Description=FTP Manager Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node $BACKEND_DIR/index.js
Restart=always
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

# Recarregar systemd e iniciar o serviço
sudo systemctl daemon-reload
sudo systemctl enable ftp-manager
sudo systemctl restart ftp-manager

# Configurar nginx
sudo cp nginx.conf /etc/nginx/sites-available/ftp-manager
sudo ln -sf /etc/nginx/sites-available/ftp-manager /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx

echo "Deploy concluído!"