FROM node:18 AS build-env
ADD . /app
WORKDIR /app
RUN npm install --omit=dev

FROM node:18-slim
COPY --from=build-env /app /app
WORKDIR /app
EXPOSE 3000
CMD ["index.js"]