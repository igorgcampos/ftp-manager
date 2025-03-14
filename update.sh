#!/bin/bash

# Diretório de destino no servidor
DEPLOY_DIR="/opt/ftp_manager"
APP_DIR="$DEPLOY_DIR/app"
BACKEND_DIR="$APP_DIR/server"
FRONTEND_DIR="$APP_DIR/static"

# Detectar alterações
BACKEND_CHANGED=false
FRONTEND_CHANGED=false

echo "Verificando alterações..."

# Verificar alterações no backend
if [ -n "$(find $APP_DIR/server -mmin -5)" ]; then
    BACKEND_CHANGED=true
fi

# Verificar alterações no frontend
if [ -n "$(find $APP_DIR/src -mmin -5)" ]; then
    FRONTEND_CHANGED=true
fi

# Se houve alterações no frontend, fazer build
if [ "$FRONTEND_CHANGED" = true ]; then
    echo "Alterações detectadas no frontend. Gerando build..."
    cd $APP_DIR
    npm run build
    
    echo "Copiando arquivos do frontend..."
    sudo cp -r dist/* $FRONTEND_DIR/
fi

# Se houve alterações no backend, reiniciar o serviço
if [ "$BACKEND_CHANGED" = true ]; then
    echo "Alterações detectadas no backend. Reiniciando serviço..."
    sudo systemctl restart ftp-manager
fi

echo "Atualização concluída!"