#!/bin/bash
# Gunbot Linux Genesis script - This sets up the linux environment to run Gunbot

sudo timedatectl set-timezone America/Phoenix
sudo apt-get update -y -q
sudo apt-get upgrade -y -q
sudo apt install wget unzip sqlite -y -q
cd /home
sudo wget https://github.com/GuntharDeNiro/BTCT/releases/download/2423/gunthy_linux.zip
sudo unzip gunthy_linux.zip
sudo rm gunthy_linux.zip
cd /home/gunthy_linux
sudo mkdir user_modules
sudo wget https://raw.githubusercontent.com/Nagilem/BotRepo/main/ichi.js
