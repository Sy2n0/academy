# HUB ACADEMY PLATFORM

Next.js 기반 플랫폼으로 Machine, Track, 시즌별 CTF 대회, 실시간 샌드박스 환경을 제공합니다.

## 기술 스택

- **[Next.js 15](https://nextjs.org)** — 앱 프레임워크 (Pages Router, SSR/SSG)
- **[React 18](https://reactjs.org)** — UI 라이브러리
- **[TypeScript](https://www.typescriptlang.org)** — 타입 안정성
- **[PostgreSQL](https://www.postgresql.org)** — 메인 데이터베이스
- **[Prisma](https://www.prisma.io)** — ORM 및 스키마 관리 (`prisma/`)
- **[NextAuth.js](https://next-auth.js.org)** — 인증 (`pages/api/auth/`)
- **[Tailwind CSS](https://tailwindcss.com)** — 스타일링
- **[Docker](https://www.docker.com)** — 챌린지 컨테이너 및 샌드박스 (Dockerode)
- **[Socket.io](https://socket.io)** — 실시간 이벤트 (`/api/socket`)
- **[Redis](https://redis.io)** — 세션 캐싱 및 큐 (ioredis)
- **[Stripe](https://stripe.com)** — 결제 및 구독
- **[Svix](https://www.svix.com)** — 웹훅 오케스트레이션
- **[Retraced](https://github.com/retracedhq/retraced)** — 감사 로그
- **[SAML Jackson](https://github.com/boxyhq/jackson)** — SAML SSO 및 디렉토리 동기화
- **[Sentry](https://sentry.io)** — 에러 모니터링
- **[Mixpanel](https://mixpanel.com)** — 사용자 분석
- **[Playwright](https://playwright.dev)** — E2E 테스트

## 플랫폼 주요 기능

### MACHINES
- Docker 기반 챌린지 컨테이너 (Static / Dynamic 타입)
- AttackBox — 사용자별 브라우저 공격 환경 (포트 범위: 20000~30000 랜덤 할당)
- 퍼스트 블러드 보너스가 포함된 플래그 제출 및 채점
- 동적 점수 시스템 (아래 채점 방식 참고)
- 컨테이너 수명 주기 관리 (CPU / Memory 제한, 만료 처리)
- 트래픽 캡처 옵션 (`enableTrafficCapture`)

### PLAYGROUND
- 시즌별 CTF 이벤트 및 참가 등록
- 챌린지별 카테고리 및 난이도 구분
- 시즌별 배지 및 보상 시스템
- 실시간 플래그 제출 추적

### SANDBOX
- Docker 기반 인스턴스가 연결된 문제 맵 (좌표 기반 `positionX`, `positionY`)
- 사용자별 격리된 컨테이너 세션
- 풀이 기록 및 리더보드

### CLOUD IDE
- 컨테이너 기반 사용자별 브라우저 IDE
- 비밀번호 보호 접근

### TRACK
- 카테고리, 난이도, 티어별 학습 모듈
- 스킬 패스 (모듈 커리큘럼 묶음)
- 수강 등록, 진도 추적, 모듈별 노트
- 과제 및 제출 지원

### RANKING & SCORE
- 전체 리더보드 및 점수 기록
- 점수 유형: Machine, Track, Playground
- 퍼스트 블러드 보너스

### TEAM
- 팀 생성, 초대, 역할 관리 (Owner / Admin / Member)
- 팀 단위 플래그 제출 및 점수 집계
- 팀별 API 키 관리

### ETC
- 라이트업 제출 및 관리자 검토 플로우
- CyberChef 도구 통합 (`/cyber-chef`)
- 아레나 모드 (`/arena`)
- 다크 모드
- 다국어 지원 (i18n, `next-i18next`)
- 웹훅 및 감사 로그
- 관리자 대시보드

## 채점 방식

### 동적 점수 시스템

풀이 수가 늘어날수록 점수가 감소하는 동적 채점 방식을 사용합니다.

```
F(S, R, D, X) = ⌊S × [R + (1 - R) × exp(1 - X / D)]⌋
```

| 파라미터 | 설명 |
|---|---|
| `S` | 기본 점수 (Base Score) |
| `R` | 최소 점수 비율 (0~1, 예: 0.2 = 20%) |
| `D` | 난이도 계수 (Difficulty Factor) |
| `X` | 누적 풀이 수 |

구현 위치: [lib/scoring.ts](lib/scoring.ts)

### First Blood 보너스

상위 3명의 정답자에게 추가 보너스를 지급합니다.

| 순위 | 보너스 비율 |
|---|---|
| 1st Blood | +5% |
| 2nd Blood | +3% |
| 3rd Blood | +1% |

## 권한 시스템

### 사용자 역할 (UserRole)

전역 권한으로, 플랫폼 전체 접근 수준을 결정합니다.

| 역할 | 설명 |
|---|---|
| `USER` | 일반 사용자 |
| `LAB` | 연구실 사용자 (Lab 전용 콘텐츠 접근) |
| `ADMIN` | 관리자 (전체 권한) |

### 팀 역할 (Role)

팀 내 권한으로, 팀 단위 작업의 접근 수준을 결정합니다.

| 역할 | 설명 |
|---|---|
| `OWNER` | 팀 오너 (팀 삭제 포함 전체 권한) |
| `ADMIN` | 팀 관리자 (멤버 관리 가능, Owner 변경 불가) |
| `MEMBER` | 일반 팀원 |

구현 위치: [lib/rbac.ts](lib/rbac.ts), [lib/user-roles.ts](lib/user-roles.ts)

## 컨테이너 아키텍처

챌린지 컨테이너는 Dockerode를 통해 직접 관리됩니다.

```
컨테이너 생성 흐름:
1. 이미지 지정 + 포트 랜덤 할당 (20000~30000)
2. CPU / Memory 리소스 제한 적용
3. 컨테이너 시작 및 DB에 인스턴스 기록
4. 만료 시간 설정 (expiresAt)
5. 만료 또는 수동 종료 시 컨테이너 stop → remove
```

**Machine 타입:**

| 타입 | 설명 |
|---|---|
| `STATIC_ATTACHMENT` | 정적 첨부파일 챌린지 |
| `DYNAMIC_ATTACHMENT` | 사용자별 동적 첨부파일 생성 |
| `STATIC_CONTAINER` | 공유 컨테이너 |
| `DYNAMIC_CONTAINER` | 사용자/팀별 독립 컨테이너 |

구현 위치: [lib/docker.ts](lib/docker.ts)

## 실시간 이벤트 (WebSocket)

Socket.io를 사용하여 실시간 이벤트를 처리합니다.

- 경로: `/api/socket`
- 특정 사용자 타겟: `user:{userId}` 룸 구조
- 브로드캐스트: 전체 또는 특정 룸 대상 이벤트 발송

구현 위치: [lib/websocket.ts](lib/websocket.ts), [pages/api/socket.ts](pages/api/socket.ts)

## 보안 설정

`next.config.js`에서 모든 응답에 보안 헤더를 적용합니다.

| 헤더 | 값 |
|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `X-Content-Type-Options` | `nosniff` |

인증 흐름: NextAuth.js + Prisma Adapter, SAML SSO (BoxyHQ Jackson), 이메일 매직 링크, Google / GitHub OAuth

## API 구조

```
pages/api/
  auth/           # NextAuth, SSO, 비밀번호 재설정
  machines/       # 머신 목록, 인스턴스 관리, 플래그 제출
  sandbox/        # 샌드박스 문제, 인스턴스, 풀이 제출
  playground/     # CTF 챌린지, 플래그 제출, 스코어보드
  learn/          # 학습 모듈, 스킬 패스, 과제
  rankings/       # 리더보드, 점수 기록
  teams/          # 팀 CRUD, 멤버 관리, API 키
  users/          # 사용자 정보, 권한
  attackbox/      # AttackBox 세션
  cloud-ide/      # Cloud IDE 세션
  scores/         # 점수 집계
  writeups/       # 라이트업 제출/리뷰
  admin/          # 관리자 전용 API
  webhooks/       # Stripe, Svix 웹훅 수신
  socket.ts       # Socket.io 서버 초기화
  health.ts       # 헬스체크
```

## 시작하기

### 사전 요구사항

- Node.js >= 18.x
- PostgreSQL
- Docker & Docker Compose
- pnpm (권장) 또는 npm

### 설치 및 실행

1. 저장소를 클론하고 프로젝트 폴더로 이동합니다.

2. 의존성 설치:

```bash
pnpm install
```

3. 환경 변수 파일 복사:

```bash
cp .env.example .env
```

4. Docker로 데이터베이스 시작:

```bash
docker-compose up -d
```

5. Prisma 스키마를 데이터베이스에 반영:

```bash
npx prisma db push
```

6. (선택) 데이터베이스 시드:

```bash
npx prisma db seed
```

7. 개발 서버 시작:

```bash
pnpm dev
# http://localhost:4003 에서 실행됩니다
```

### Prisma Studio

데이터베이스 시각적 편집기:

```bash
npx prisma studio
```

```bash
pnpm sync-stripe
```

## Environment

`.env` 파일에서 설정이 필요한 주요 변수:

| 변수명 | 설명 |
|---|---|
| `DATABASE_URL` | PostgreSQL 연결 문자열 |
| `NEXTAUTH_SECRET` | NextAuth.js 시크릿 (`openssl rand -base64 32` 으로 생성) |
| `NEXTAUTH_URL` | 앱 베이스 URL |
| `SMTP_*` | 이메일 설정 (host, port, user, password, from) |
| `STRIPE_SECRET_KEY` | Stripe API 시크릿 키 |
| `STRIPE_WEBHOOK_SECRET` | Stripe 웹훅 서명 시크릿 |
| `SVIX_API_KEY` | Svix 웹훅 API 키 |
| `SENTRY_DSN` | Sentry 에러 모니터링 DSN |
| `RECAPTCHA_SITE_KEY` / `RECAPTCHA_SECRET_KEY` | Google reCAPTCHA 키 |
| `MIXPANEL_TOKEN` | Mixpanel 분석 토큰 |
| `ATTACKBOX_HOST` | AttackBox 컨테이너 호스트 주소 |
| `REDIS_URL` | Redis 연결 문자열 |

## 스크립트

```bash
pnpm dev          # 개발 서버 시작 (포트 4003)
pnpm build        # Prisma 클라이언트 생성 + 스키마 반영 + Next.js 빌드
pnpm start        # 프로덕션 서버 시작 (포트 4002)
pnpm test         # Jest 단위 테스트 실행
pnpm test:e2e     # Playwright E2E 테스트 실행
pnpm check-types  # TypeScript 타입 검사
pnpm check-lint   # ESLint 검사
pnpm format       # Prettier 포맷
pnpm delete-team  # CLI: 팀 삭제 (슬러그 지정)
pnpm check-locale # i18n 로케일 키 커버리지 확인
```

## 테스트

단위 테스트는 [Jest](https://jestjs.io)를 사용하며 `__tests__/` 폴더에 위치합니다.

E2E 테스트는 [Playwright](https://playwright.dev)를 사용하며 `tests/` 폴더에 위치합니다.

```bash
# Playwright 브라우저 설치
pnpm playwright:update

# E2E 테스트 실행
pnpm test:e2e
```

HTML 리포트는 `report/` 폴더에 생성됩니다. 지원 브라우저: `chromium`, `firefox`

## 프로젝트 구조

```
pages/          # Next.js 페이지 (라우트)
  api/          # API 라우트
  admin/        # 관리자 패널
  arena/        # 아레나 모드
  attackbox/    # AttackBox 랩
  auth/         # 인증 페이지
  cloud-ide/    # 클라우드 IDE
  learn/        # 학습 모듈
  playground*/  # CTF 플레이그라운드
  sandbox/      # 샌드박스 문제
  rankings/     # 리더보드
  settings/     # 사용자/팀 설정
components/     # React 컴포넌트
lib/            # 공통 유틸리티 및 헬퍼
models/         # 데이터 접근 레이어
prisma/         # 스키마 및 마이그레이션
locales/        # i18n 번역 파일
types/          # TypeScript 타입 정의
scripts/        # 유틸리티 스크립트
```
