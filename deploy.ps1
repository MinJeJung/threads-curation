# Netlify 자동 배포 스크립트
cd "C:\Users\mj859\OneDrive\바탕 화면\글쓰기_콘텐츠\threads-curation"

# Netlify 사이트 링크 (Git 기반)
Write-Host "Linking to Netlify..."
$process = Start-Process -FilePath "netlify" -ArgumentList "link", "--name", "threads-curation-minje" -NoNewWindow -PassThru -Wait

# 배포
Write-Host "Deploying to Netlify..."
netlify deploy --prod --dir=.
