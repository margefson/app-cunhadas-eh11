#!/bin/bash
apt update
apt install -y docker.io docker-compose git python3 unzip
service docker start
cd /home/ubuntu
git clone https://github.com/seuusuario/meuapp.git || (cd meuapp && git pull)
cd meuapp
docker-compose build
docker-compose up -d