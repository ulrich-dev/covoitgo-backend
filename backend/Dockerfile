# ── Image de base Node.js 20 (Alpine = légère) ──
FROM node:20-alpine

# Dossier de travail dans le container
WORKDIR /app

# Copier les fichiers de dépendances en premier (cache Docker)
COPY package.json package-lock.json* ./

# Installer les dépendances (production uniquement)
RUN npm install --omit=dev

# Copier tout le code source
COPY . .

# Créer le dossier uploads (avatars, documents)
RUN mkdir -p uploads/avatars uploads/documents

# Railway injecte automatiquement la variable PORT
EXPOSE 3000

# Démarrer le serveur
CMD ["node", "server.js"]