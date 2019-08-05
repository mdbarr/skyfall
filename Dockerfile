FROM node:10-alpine
WORKDIR /skyfall
ENV NODE_ENV=production
COPY package.json yarn.lock ./
RUN yarn --silent install --production=true
COPY . .
EXPOSE 7520
CMD [ "yarn", "start" ]
