# Machine 생성 및 관리 가이드

## 개요

HUB ACADEMY의 Machine은 CTF 챌린지를 위한 문제입니다. 각 Machine은 특정 타입을 가지며, 타입에 따라 플래그 관리 방식이 달라집니다.

## Machine 타입 (MachineType)

### 1. STATIC_ATTACHMENT (정적 첨부)

**특징:**

- 공유 첨부 파일을 사용합니다
- 모든 사용자가 동일한 첨부 파일을 다운로드합니다
- 설정된 모든 정적 플래그를 사용할 수 있습니다
- 플래그는 고정되어 있으며 모든 사용자에게 동일합니다

**사용 시나리오:**

- 파일 분석 문제 (Forensics, Steganography)
- 정적 바이너리 분석 문제 (Reverse Engineering)
- 모든 사용자가 동일한 파일을 분석해야 하는 경우

**설정 방법:**

1. Type: `STATIC_ATTACHMENT` 선택
2. Attachment URL: 첨부 파일 URL 입력 (예: `https://example.com/challenge.zip`)
3. Static Flags: 쉼표로 구분된 플래그 목록 입력
   - 예: `flag{abc123}, flag{def456}, flag{ghi789}`
4. Container Image: 필요 없음 (비워두기)

**플래그 관리:**

- Machine 생성 시 Static Flags 필드에 플래그를 입력하면 자동으로 생성됩니다
- 또는 Flag Management 페이지에서 추가/삭제 가능합니다
- 모든 사용자가 동일한 플래그를 제출합니다

---

### 2. DYNAMIC_ATTACHMENT (동적 첨부)

**특징:**

- 팀별 또는 사용자별로 고유한 첨부 파일을 제공합니다
- 플래그와 첨부 파일의 수는 팀 수 이상이어야 합니다
- 각 팀/사용자마다 다른 플래그를 받습니다
- 플래그는 동적으로 생성됩니다

**사용 시나리오:**

- 팀별로 다른 파일을 분석해야 하는 문제
- 플래그 공유를 방지하고 싶은 경우
- 각 사용자마다 고유한 챌린지를 제공하고 싶은 경우

**설정 방법:**

1. Type: `DYNAMIC_ATTACHMENT` 선택
2. Attachment URL: 동적 첨부 파일 생성 API 엔드포인트 (선택사항)
3. Flag Template: 플래그 템플릿 입력 (예: `HUB{xxx}`, `flag{xxx}`)
   - `xxx` 부분이 랜덤 값으로 대체됩니다
4. Static Flags: 사용하지 않음 (비워두기)

**플래그 관리:**

- Flag Template만 설정하면 됩니다
- 실제 플래그는 팀/사용자별로 동적으로 생성됩니다
- Flag Management 페이지에서 팀/사용자별 플래그를 생성할 수 있습니다

**플래그 생성 방법:**

```javascript
// API 호출 예시
POST /api/admin/machines/{machineId}/flags
{
  "action": "generate-dynamic",
  "teamIds": ["team-id-1", "team-id-2"],
  "flagTemplate": "HUB{xxx}"  // 선택사항, 머신의 flagTemplate 사용
}
```

---

### 3. STATIC_CONTAINER (정적 컨테이너)

**특징:**

- 공유 컨테이너 템플릿을 사용합니다
- 모든 사용자가 동일한 컨테이너에 접속합니다
- 동적 플래그는 발행되지 않습니다
- 설정된 모든 정적 플래그를 제출할 수 있습니다

**사용 시나리오:**

- 웹 취약점 문제 (Web)
- 네트워크 문제 (Network)
- 모든 사용자가 동일한 서버 환경을 공유하는 경우

**설정 방법:**

1. Type: `STATIC_CONTAINER` 선택
2. Container Image: Docker 이미지 이름 (예: `ctf/web-challenge:latest`)
3. Service Port: 컨테이너 내부 서비스 포트 (예: `80`, `8080`)
4. Static Flags: 쉼표로 구분된 플래그 목록 입력
   - 예: `flag{root_access}, flag{user_flag}`
5. Attachment URL: 필요 없음 (비워두기)

**컨테이너 설정:**

- CPU Limit: CPU 제한 (0.1 CPU 단위, 예: 10 = 1 CPU)
- Memory Limit: 메모리 제한 (MB)
- Service Port: 컨테이너 내부 포트

**플래그 관리:**

- Machine 생성 시 Static Flags 필드에 플래그를 입력하면 자동으로 생성됩니다
- 또는 Flag Management 페이지에서 추가/삭제 가능합니다
- 모든 사용자가 동일한 플래그를 제출합니다

---

### 4. DYNAMIC_CONTAINER (동적 컨테이너)

**특징:**

- 각 사용자/팀별로 고유한 컨테이너 인스턴스를 생성합니다
- 컨테이너 환경 변수를 통해 플래그를 자동으로 생성하고 발행합니다
- 각 팀의 플래그는 고유합니다
- 사용자가 컨테이너를 시작/중지할 수 있습니다

**사용 시나리오:**

- 각 팀마다 독립적인 환경이 필요한 문제
- 플래그 공유를 완전히 방지하고 싶은 경우
- 동적으로 컨테이너를 배포해야 하는 경우

**설정 방법:**

1. Type: `DYNAMIC_CONTAINER` 선택
2. Container Image: Docker 이미지 이름 (예: `ctf/pwn-challenge:latest`)
3. Service Port: 컨테이너 내부 서비스 포트 (예: `1337`)
4. Flag Template: 플래그 템플릿 입력 (예: `HUB{xxx}`)
   - 컨테이너 환경 변수로 전달됩니다
5. Static Flags: 사용하지 않음 (비워두기)

**컨테이너 설정:**

- CPU Limit: CPU 제한 (0.1 CPU 단위)
- Memory Limit: 메모리 제한 (MB)
- Service Port: 컨테이너 내부 포트

**플래그 관리:**

- Flag Template만 설정하면 됩니다
- 사용자가 컨테이너를 시작하면 자동으로 플래그가 생성됩니다
- 각 컨테이너 인스턴스마다 고유한 플래그가 할당됩니다

**사용자 경험:**

1. Machine 상세 페이지에서 "Start Container" 버튼 클릭
2. 컨테이너가 시작되면 IP 주소와 포트가 표시됩니다
3. 플래그는 컨테이너 환경 변수로 전달됩니다
4. 문제를 해결한 후 플래그를 제출합니다

---

## Machine 생성 단계별 가이드

### 1단계: 기본 정보 입력

**Title** (필수)

- Machine의 제목
- 예: `SokopwnRev`, `Web SQL Injection`, `Crypto RSA`

**Description** (선택)

- 마크다운 형식으로 작성 가능
- 예:

  ```markdown
  **Author:** cbh
  **Difficulty:** Medium
  **Category:** Pwn

  ---

  This is a reverse engineering challenge.
  ```

**Type** (필수, 변경 불가)

- `STATIC_ATTACHMENT`: 정적 첨부
- `DYNAMIC_ATTACHMENT`: 동적 첨부
- `STATIC_CONTAINER`: 정적 컨테이너
- `DYNAMIC_CONTAINER`: 동적 컨테이너

**Category** (필수)

- 문제 카테고리
- 예: `pwn`, `web`, `crypto`, `forensics`, `misc`, `reverse`

---

### 2단계: 시도 제한 설정

**Max Attempts**

- 최대 시도 횟수
- `unlimited`: 무제한
- 숫자 입력: 해당 횟수만큼만 플래그 제출 가능

---

### 3단계: 점수 설정

**Score** (필수)

- 초기 점수 (기본 점수)
- 예: `1000`, `500`, `2000`

**Difficulty Factor** (필수)

- 난이도 계수
- 동적 점수 계산에 사용됩니다
- 값이 클수록 점수가 천천히 감소합니다
- 권장값: `10` ~ `20`

**Minimum Score Ratio** (필수)

- 최소 점수 비율 (0-100%)
- 점수가 이 비율 이하로 떨어지지 않습니다
- 예: `20` = 최소 20% (1000점 기준 최소 200점)

**Blood Bonus**

- First Blood 보너스 활성화 여부
- 활성화 시:
  - 1등: 현재 점수의 5% 보너스
  - 2등: 현재 점수의 3% 보너스
  - 3등: 현재 점수의 1% 보너스

**동적 점수 공식:**

```
F(S, R, D, X) = ⌊ S × [ R + (1 − R) × exp(1 − X/D) ] ⌋

S = 초기 점수 (Score)
R = 최소 점수 비율 (Minimum Score Ratio / 100)
D = 난이도 계수 (Difficulty Factor)
X = 해결 횟수 (Number of Solves)
```

**예시:**

- 초기 점수: 1000
- 최소 점수 비율: 20%
- 난이도 계수: 13
- 해결 횟수별 점수:
  - 0회: 1000점
  - 1회: 923점
  - 5회: 680점
  - 10회: 500점
  - 20회: 350점
  - 50회: 200점 (최소 점수)

---

### 4단계: Challenge 설정

**Flag Template** (동적 타입 필수)

- 동적 플래그 생성에 사용되는 템플릿
- `xxx` 부분이 랜덤 값으로 대체됩니다
- 예:
  - `flag{xxx}` → `flag{a1b2c3d4e5f6}`
  - `HUB{xxx}` → `HUB{test_flag}`
  - `CTF{xxx}` → `CTF{random123}`

**Attachment URL** (첨부 타입 필수)

- 첨부 파일 다운로드 URL
- 정적 첨부: 모든 사용자가 동일한 파일
- 동적 첨부: 팀별로 다른 파일 (API 엔드포인트)

**Static Flags** (정적 타입 필수)

- 쉼표로 구분된 플래그 목록
- 예: `flag{abc123}, flag{def456}, flag{ghi789}`
- 여러 플래그를 입력하면 모두 정답으로 인정됩니다

---

### 5단계: 컨테이너 설정 (컨테이너 타입만)

**Container Image** (필수)

- Docker 이미지 이름
- 예: `ctf/web-challenge:latest`, `netcat-machine:latest`
- "Test" 버튼으로 이미지 형식 검증 가능

**Service Port** (필수)

- 컨테이너 내부 서비스 포트
- 예: `80`, `8080`, `1337`, `3306`

**CPU Limit** (필수)

- CPU 제한 (0.1 CPU 단위)
- 예: `10` = 1 CPU, `5` = 0.5 CPU

**Memory Limit** (필수)

- 메모리 제한 (MB)
- 예: `512`, `1024`, `2048`

---

## 타입별 설정 요약표

| 타입               | Attachment URL | Flag Template | Static Flags | Container Image | Service Port |
| ------------------ | -------------- | ------------- | ------------ | --------------- | ------------ |
| STATIC_ATTACHMENT  | ✅ 필수        | ❌            | ✅ 필수      | ❌              | ❌           |
| DYNAMIC_ATTACHMENT | ⚠️ 선택        | ✅ 필수       | ❌           | ❌              | ❌           |
| STATIC_CONTAINER   | ❌             | ❌            | ✅ 필수      | ✅ 필수         | ✅ 필수      |
| DYNAMIC_CONTAINER  | ❌             | ✅ 필수       | ❌           | ✅ 필수         | ✅ 필수      |

---

## 플래그 관리 방법

### 정적 플래그 추가 (STATIC_ATTACHMENT, STATIC_CONTAINER)

**방법 1: Machine 생성 시**

1. Machine 생성 페이지의 "Challenge Configuration" 섹션
2. "Static Flags" 필드에 쉼표로 구분하여 입력
   - 예: `flag{abc123}, flag{def456}`
3. Machine 생성 시 자동으로 플래그가 생성됩니다

**방법 2: Flag Management 페이지**

1. `/admin/machines/flags` 접속
2. 머신 선택
3. "Add Flags" 버튼 클릭
4. "Static Flags" 필드에 플래그 입력
5. 저장

**주의사항:**

- 정적 타입 머신에만 사용 가능
- 모든 사용자가 동일한 플래그를 사용합니다

---

### 동적 플래그 템플릿 설정 (DYNAMIC_ATTACHMENT, DYNAMIC_CONTAINER)

**방법 1: Machine 생성 시**

1. Machine 생성 페이지의 "Challenge Configuration" 섹션
2. "Flag Template" 필드에 템플릿 입력
   - 예: `HUB{xxx}`, `flag{xxx}`
3. Machine 생성 시 자동으로 저장됩니다

**방법 2: Flag Management 페이지**

1. `/admin/machines/flags` 접속
2. 머신 선택
3. "Add Flags" 버튼 클릭
4. "Flag Template" 필드에 템플릿 입력
5. 저장 (Static Flags는 비워두기)

**동적 플래그 생성:**

- 팀별 플래그 생성:

  ```javascript
  POST /api/admin/machines/{machineId}/flags
  {
    "action": "generate-dynamic",
    "teamIds": ["team-id-1", "team-id-2"],
    "flagTemplate": "HUB{xxx}"  // 선택사항
  }
  ```

- 사용자별 플래그 생성:
  ```javascript
  POST /api/admin/machines/{machineId}/flags
  {
    "action": "generate-dynamic",
    "userIds": ["user-id-1", "user-id-2"],
    "flagTemplate": "HUB{xxx}"  // 선택사항
  }
  ```

---

## 컨테이너 관리

### 컨테이너 시작 (DYNAMIC_CONTAINER)

1. Machine 상세 페이지 (`/machines/{id}`) 접속
2. "Container Control" 섹션에서 "Start Container" 버튼 클릭
3. 컨테이너가 시작되면 IP 주소와 포트가 표시됩니다
4. 접속 정보를 복사하여 사용합니다

**접속 정보:**

- IP 주소: 컨테이너의 IP 주소
- 포트: 매핑된 포트 번호
- 예: `172.17.0.2:32768`

### 컨테이너 중지

1. Machine 상세 페이지에서 실행 중인 컨테이너 확인
2. "Stop Container" 버튼 클릭
3. 컨테이너가 중지됩니다

**주의사항:**

- 컨테이너를 중지하면 접속 정보가 사라집니다
- 다시 시작하면 새로운 IP 주소와 포트가 할당됩니다

---

## 플래그 제출

### 제출 방법

1. Machine 상세 페이지 접속
2. "Submit Flag" 섹션에서 플래그 입력
3. "Submit Flag" 버튼 클릭

### 제출 결과

**정답인 경우:**

- 점수 획득
- First Blood인 경우 보너스 점수 추가
- 성공 메시지 표시

**오답인 경우:**

- 오류 메시지 표시
- 시도 횟수 차감 (Max Attempts가 설정된 경우)

---

## 문제 해결

### "Machine type does not support static flags" 오류

**원인:**

- 동적 타입 머신 (DYNAMIC_ATTACHMENT, DYNAMIC_CONTAINER)에 정적 플래그를 추가하려고 할 때 발생

**해결:**

- 동적 타입 머신에는 Flag Template만 설정하세요
- Static Flags 필드는 비워두세요

### "Please enter at least one flag" 오류

**원인:**

- Flag Template과 Static Flags 모두 비어있을 때 발생

**해결:**

- 정적 타입: Static Flags에 플래그 입력
- 동적 타입: Flag Template에 템플릿 입력

### 컨테이너가 시작되지 않음

**원인:**

- Docker 이미지가 존재하지 않음
- 리소스 부족
- 포트 충돌

**해결:**

1. Container Image가 올바른지 확인
2. Docker 이미지가 로컬에 있는지 확인
3. 서버 리소스 확인

### 플래그가 생성되지 않음

**원인:**

- 머신 타입과 플래그 타입이 맞지 않음
- 플래그 템플릿 형식 오류

**해결:**

1. 머신 타입 확인
2. 플래그 템플릿에 `xxx` 포함 여부 확인
3. Flag Management 페이지에서 수동으로 생성

---

## 예시 시나리오

### 시나리오 1: 정적 웹 문제 생성

1. Type: `STATIC_CONTAINER` 선택
2. Title: `SQL Injection Challenge`
3. Category: `web`
4. Container Image: `ctf/web-sqli:latest`
5. Service Port: `80`
6. Static Flags: `flag{sql_injection_success}`
7. Score: `500`, Difficulty Factor: `10`, Min Score Ratio: `20%`

### 시나리오 2: 동적 Pwn 문제 생성

1. Type: `DYNAMIC_CONTAINER` 선택
2. Title: `Buffer Overflow Challenge`
3. Category: `pwn`
4. Container Image: `ctf/pwn-bof:latest`
5. Service Port: `1337`
6. Flag Template: `HUB{xxx}`
7. Score: `1000`, Difficulty Factor: `15`, Min Score Ratio: `25%`

### 시나리오 3: 정적 파일 분석 문제 생성

1. Type: `STATIC_ATTACHMENT` 선택
2. Title: `Steganography Challenge`
3. Category: `forensics`
4. Attachment URL: `https://storage.example.com/challenge.zip`
5. Static Flags: `flag{hidden_in_image}, flag{extracted_data}`
6. Score: `300`, Difficulty Factor: `8`, Min Score Ratio: `30%`

---

## 권장 사항

1. **타입 선택:**
   - 모든 사용자가 동일한 환경을 사용: `STATIC_CONTAINER` 또는 `STATIC_ATTACHMENT`
   - 플래그 공유 방지가 중요: `DYNAMIC_CONTAINER` 또는 `DYNAMIC_ATTACHMENT`

2. **점수 설정:**
   - 쉬운 문제: 낮은 초기 점수, 높은 난이도 계수
   - 어려운 문제: 높은 초기 점수, 낮은 난이도 계수

3. **플래그 템플릿:**
   - 일관된 형식 사용 권장 (예: 모든 문제에 `HUB{xxx}`)
   - `xxx` 부분은 반드시 포함

4. **컨테이너 이미지:**
   - 생성 전에 이미지 테스트 권장
   - 태그를 명시적으로 지정 (예: `:latest`, `:v1.0`)
