#!/bin/bash

nvm install node
npm install -g npm@latest
npm install uuid@latest
npm install --save lodash@latest
npm install pm2
cd /home/gunthy_linux/user_modules
sudo cp -R /home/botmaster/node_modules/lodash .
cd /home
sudo chmod -R 777 gunthy_linux