# syntax=docker/dockerfile:1.7
FROM node:24.22.3-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5

WORKDIR /app

COPY package*.json ./

RUN --mount=type=secret,id=npmca,required=false \
    if [ -f /run/secrets/npmca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/npmca; fi; \
    npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
