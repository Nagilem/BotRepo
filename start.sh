#!/bin/bash
#Startup script for Bot VMs

cd /home/gunthy_linux
sudo wget https://raw.githubusercontent.com/Nagilem/BotRepo/main/ichi.js
pm2 start gunthy-linux
pm2 logs 0 