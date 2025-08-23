FROM node:22.18.0-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY . .
# COPY entrypoint.sh .

RUN npm run build
# RUN chmod +x entrypoint.sh

CMD ["node", "dist/main.js"]
# CMD ["./entrypoint.sh"]

EXPOSE 3000