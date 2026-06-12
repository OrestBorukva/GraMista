# Локальний dev-образ GraMista (Next; вебхук-інжест живе в самому застосунку).
# Залежності ставляться в контейнері (Linux), щоб не конфліктувати з Windows-node_modules хоста.
# Код монтується через docker-compose (bind mount) — зміни підхоплюються на льоту.
FROM node:22-bookworm-slim

# openssl потрібен рушієві Prisma
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Спершу лише маніфести — кешуємо шар із залежностями
COPY package.json package-lock.json ./
RUN npm ci

# Генеруємо Prisma Client під Linux-рушій
COPY prisma ./prisma
RUN npx prisma generate

# Решта коду (у dev перекривається bind-mount'ом; лишаємо як фолбек)
COPY . .

EXPOSE 3002

CMD ["npx", "next", "dev", "-H", "0.0.0.0", "-p", "3002"]
