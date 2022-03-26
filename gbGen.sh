#!/bin/bash
# Gunbot Linux Genesis script - This sets up the linux environment to run Gunbot

sudo apt-get update -y -q
sudo apt-get upgrade -y -q
sudo apt install wget unzip sqlite -y -q
cd /home
sudo wget https://github.com/GuntharDeNiro/BTCT/releases/download/2329/gunthy_linux.zip
sudo unzip gunthy_linux.zip
sudo wget -qO- https://raw.githubusercontent.com/creationix/nvm/master/install.sh | bash
sudo source ~/.profile 
nvm install node
npm install -g npm@latest
npm install uuid@latest
npm install --save lodash@latest
npm install pm2
cd /home/gunthy_linux
sudo mkdir user_modules
cd user_modules
sudo cp -R /home/botmaster/node_modules/lodash .
cd /home/gunthy_linux
sudo wget https://github.com/Nagilem/BotRepo/blob/main/ichi.js
cd /home
sudo chmod -R 777 gunthy_linux
