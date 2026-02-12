# Netlify 배포 가이드

## 🔧 자동 배포 설정 방법

### 1단계: Netlify Personal Access Token 발급

1. [Netlify Personal Access Tokens](https://app.netlify.com/user/applications#personal-access-tokens) 페이지 접속
2. "New access token" 클릭
3. Description: `GitHub Actions Deploy` 입력
4. "Generate token" 클릭
5. 생성된 토큰 복사 (한 번만 표시됨!)

### 2단계: Netlify에서 새 사이트 생성

**옵션 A: GitHub 연동 (추천)**
1. [Netlify Dashboard](https://app.netlify.com) 접속
2. "Add new site" → "Import an existing project" 클릭
3. "Deploy with GitHub" 선택
4. `MinJeJung/threads-curation` 저장소 선택
5. 설정 확인:
   - Build command: (비워두기)
   - Publish directory: `.`
6. "Deploy site" 클릭
7. 배포 완료 후 **Site ID** 복사 (Settings → General → Site details → Site ID)

**옵션 B: 수동 생성**
1. [Netlify Sites](https://app.netlify.com/sites) 접속
2. "Add new site" → "Start from scratch" 클릭
3. Site name: `threads-curation-minje` (또는 원하는 이름)
4. 생성 후 **Site ID** 복사

### 3단계: GitHub Secrets 설정

1. GitHub 저장소 페이지 접속: https://github.com/MinJeJung/threads-curation
2. Settings → Secrets and variables → Actions 이동
3. "New repository secret" 클릭하여 다음 2개 추가:

   **Secret 1:**
   - Name: `NETLIFY_AUTH_TOKEN`
   - Value: 1단계에서 복사한 Netlify Personal Access Token

   **Secret 2:**
   - Name: `NETLIFY_SITE_ID`
   - Value: 2단계에서 복사한 Site ID

### 4단계: 코드 푸시 및 자동 배포

```bash
git add .
git commit -m "Add GitHub Actions for Netlify deployment"
git push
```

푸시 후 자동으로:
- GitHub Actions가 실행됩니다
- Netlify에 자동 배포됩니다
- 배포 URL: `https://[site-name].netlify.app`

## ✅ 완료 후 확인사항

- GitHub Actions 탭에서 워크플로우 실행 확인
- Netlify 대시보드에서 배포 상태 확인
- 배포된 사이트 접속: `https://[site-name].netlify.app`

## 🔄 이후 사용법

main 브랜치에 푸시할 때마다 자동으로 Netlify에 배포됩니다!
