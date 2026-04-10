FROM node:20-alpine

WORKDIR /app

# Copier les dépendances en premier (cache Docker)
COPY package.json package-lock.json* ./

# Installer sans les devDependencies
RUN npm install --omit=dev

# Copier tout le code
COPY . .

# Créer les dossiers uploads
RUN mkdir -p uploads/avatars uploads/documents

EXPOSE 3000

CMD ["node", "server.js"]
