# 빌드 스테이지
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# 의존성 파일만 먼저 복사하여 캐시 활용
COPY package*.json ./
RUN npm ci

# 소스 코드 복사 및 빌드
COPY . .
RUN npm run build

# 프로덕션 스테이지
FROM node:20-alpine

WORKDIR /usr/src/app

# 프로덕션 의존성만 설치
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force && \
    rm -rf /root/.npm /tmp/*

# 빌드된 파일만 복사
COPY --from=builder /usr/src/app/dist ./dist

# 환경 변수 설정
ENV NODE_ENV=production

# 불필요한 파일 제거
RUN rm -rf /usr/src/app/node_modules/.cache && \
    find /usr/src/app/node_modules -type d -name "test" -o -name "tests" -o -name "docs" -o -name "examples" | xargs rm -rf

EXPOSE 3000
CMD ["node", "dist/src/main.js"]
