# 1. Node.js 이미지 사용
FROM node:20-alpine

# 2. 작업 디렉토리 설정
WORKDIR /usr/src/app

# 3. 의존성 복사 및 설치
COPY package*.json ./
RUN npm install

# 4. 애플리케이션 소스 코드 복사
COPY . .

# 5. 빌드 및 환경 설정
RUN npm run build

# 6. 애플리케이션 실행
EXPOSE 3000
CMD ["node", "dist/src/main.js"]
