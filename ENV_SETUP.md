# 환경 변수 설정 가이드

## MinIO 설정

MinIO를 사용하려면 다음 환경 변수를 설정하세요.

**리버스 프록시 사용 시 (bucket.hub-h4ck.com):**

```bash
S3_ENDPOINT=https://bucket.hub-h4ck.com     # MinIO API 주소 (서버→MinIO 연결)
S3_PUBLIC_ENDPOINT=https://bucket.hub-h4ck.com  # presigned URL에 쓸 주소 (브라우저에서 열 때 사용)
S3_ACCESS_KEY_ID=minioadmin                 # MinIO Access Key
S3_SECRET_ACCESS_KEY=minioadmin             # MinIO Secret Key
S3_BUCKET=hub-academy                       # 버킷 이름
S3_REGION=us-east-1                         # 리전 (MinIO는 무시됨)
```

`S3_PUBLIC_ENDPOINT`를 두면 View/Download 링크가 이 주소로 생성됩니다. 서버가 `S3_ENDPOINT=http://localhost:9000`로 MinIO에 붙어 있어도, 링크는 `S3_PUBLIC_ENDPOINT`로 나가서 브라우저에서 열 수 있습니다.

**로컬 MinIO 직접 연결 시:**

```bash
S3_ENDPOINT=http://localhost:9000           # MinIO 서버 주소
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET=hub-academy
S3_REGION=us-east-1
```

### bucket.hub-h4ck.com 리버스 프록시 설정

MinIO를 `bucket.hub-h4ck.com`으로 노출하려면 nginx에 다음 설정을 추가하세요.

```bash
sudo cp /home/ubuntu/HUB-ACADEMY/deploy/nginx-bucket.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/nginx-bucket.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

DNS에서 `bucket.hub-h4ck.com`을 이 서버 IP로 연결하고, SSL은 Cloudflare 또는 기존 443 설정에 server 블록을 추가해 사용하세요.

### MinIO가 계속 :9001로 리다이렉트할 때

MinIO는 기본적으로 브라우저를 콘솔(9001)로 보냅니다. **같은 도메인**에서 쓰려면:

1. **nginx**에서 `bucket.hub-h4ck.com/console/` → `127.0.0.1:9001` 프록시가 있어야 합니다.  
   (이미 `hub-platform-443.conf`에 `/console/` location 추가됨. 80 사용 시에는 `deploy/nginx-bucket.conf`에 동일한 `location /console/` 블록을 추가한 뒤 `sudo cp`·`sudo nginx -t`·`sudo systemctl reload nginx` 적용.)

2. **MinIO**에 브라우저 리다이렉트 URL을 지정합니다.
   - **Docker** 예:  
     `-e "MINIO_BROWSER_REDIRECT_URL=https://bucket.hub-h4ck.com/console"`
   - **systemd/직접 실행** 예:  
     `MINIO_BROWSER_REDIRECT_URL=https://bucket.hub-h4ck.com/console`  
   MinIO 재시작 후에는 `https://bucket.hub-h4ck.com/` 접속 시 `:9001`이 아닌 `https://bucket.hub-h4ck.com/console`로만 이동해야 합니다.

### MinIO 서버 시작 (Docker)

```bash
docker run -d \
  -p 9000:9000 \
  -p 9001:9001 \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  --name minio \
  minio/minio server /data --console-address ":9001"
```

### 버킷 생성

MinIO 콘솔 (http://localhost:9001)에 접속하여 `hub-academy` 버킷을 생성하세요.

## Redis 설정

```bash
REDIS_URL=redis://localhost:6379
```

### Redis 서버 시작 (Docker)

```bash
docker run -d \
  -p 6379:6379 \
  --name redis \
  redis:latest
```

## Cloudflare Turnstile

1. https://dash.cloudflare.com/ 접속
2. Turnstile 섹션에서 사이트 생성
3. Secret Key와 Site Key를 환경 변수에 설정:

```bash
CLOUDFLARE_TURNSTILE_SECRET_KEY=your_secret_key
CLOUDFLARE_TURNSTILE_SITE_KEY=your_site_key
```

## 로컬 스토리지 (S3 없을 때)

S3/MinIO가 설정되지 않은 경우 로컬 디스크에 저장됩니다:

```bash
LOCAL_STORAGE_DIR=./storage
```

## 환경 변수 확인

모든 환경 변수가 올바르게 설정되었는지 확인:

```bash
cd /home/ubuntu/HUB-ACADEMY
cat .env | grep -E "(S3_|REDIS_|TURNSTILE_|LOCAL_STORAGE)"
```
