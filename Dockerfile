# Use official Playwright image with Node.js and browsers pre-installed
FROM mcr.microsoft.com/playwright:v1.55.0-noble AS playwright-base

# Install bun
RUN npm install -g bun
WORKDIR /app

FROM playwright-base AS dev
COPY package*.json ./
RUN bun install

COPY . .

ENV NODE_ENV=development
ENV HOST=0.0.0.0
EXPOSE 5173

CMD ["bun", "run", "dev", "--host"]
