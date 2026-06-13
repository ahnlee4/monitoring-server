FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

EXPOSE 4173

CMD ["sh", "-lc", "npm run build && npm run preview -- --host 0.0.0.0 --port 4173"]
