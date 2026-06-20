# Admin Dashboard 사용 가이드

## 개요

HUB ACADEMY Admin Dashboard는 CTF 플랫폼의 모든 기능을 관리할 수 있는 통합 관리 시스템입니다.

## 주요 기능

### 1. MACHINES (머신 관리)

#### Active Machines

- **Manage** (`/admin/machines/active/manage`): 활성 머신 목록 관리
  - 머신 검색
  - 머신 활성화/비활성화 토글
  - 머신 수정 및 삭제
- **Create** (`/admin/machines/active/create`): 새 활성 머신 생성
  - Challenge Details: 제목, 설명, 타입, 카테고리
  - Scoring Configuration: 점수, 난이도 계수, 최소 점수 비율, First Blood 보너스
  - Challenge Configuration: 플래그 템플릿, 첨부 파일 URL, 정적 플래그
  - Container Configuration: 컨테이너 이미지, 서비스 포트, CPU/메모리 제한
- **View** (`/machines`): 공개 머신 목록 보기

#### Flag Management (`/admin/machines/flags`)

- 머신별 플래그 관리
- 정적 플래그 추가/삭제
- 동적 플래그 템플릿 설정
- 플래그 목록 조회

**사용 방법:**

1. 머신 선택 드롭다운에서 관리할 머신 선택
2. "Add Flags" 버튼 클릭
3. 정적 플래그 입력 또는 플래그 템플릿 설정
4. 저장

### 2. CONTENT (콘텐츠 관리)

#### Playground Settings (`/admin/playground`)

- Playground 설정 관리
- 시즌, 타입, 이름, 코드명 설정
- 시작/종료 날짜 설정
- 설정 히스토리 관리
- 미리보기 기능

**사용 방법:**

1. Playground 이름, 코드명, 시즌 입력
2. 타입 선택 (beta, recruiting, regular, special)
3. 시작/종료 날짜 설정
4. "Preview" 버튼으로 미리보기
5. "Save Settings"로 저장
6. 히스토리에서 "Set as Active"로 활성화

#### Learn Management (`/admin/learn`)

- 학습 콘텐츠 관리
- 모듈 및 트랙 관리

### 3. COMMUNITY (커뮤니티 관리)

#### Team Management (`/admin/teams`)

- 모든 팀 목록 조회
- 팀별 초대 코드 확인 및 복사
- 팀원 수 및 점수 확인

**사용 방법:**

1. 팀 목록에서 팀 검색
2. 초대 코드 복사 버튼 클릭
3. 팀 정보 확인

#### Writeup Review (`/admin/writeups`)

- 사용자 제출 작성물 검토
- 승인/거부 처리
- 작성물 일괄 다운로드

**사용 방법:**

1. 검토할 작성물 선택
2. "Review" 버튼 클릭
3. 내용 확인 후 코멘트 입력 (선택)
4. "Approve" 또는 "Reject" 버튼 클릭
5. "Download All"로 모든 작성물 다운로드

#### User Management (`/admin/users`)

- 사용자 관리
- 권한 설정 (USER, LAB, ADMIN)
- 사용자 차단/해제

### 4. SYSTEM (시스템 관리)

#### Monitoring (`/admin/monitoring`)

- 플래그 제출 기록 모니터링
- 시스템 이벤트 로그 확인
- 실시간 제출 현황 파악

**사용 방법:**

1. "Flag Submissions" 탭에서 제출 기록 확인
2. "Event Logs" 탭에서 시스템 이벤트 확인
3. 검색 기능으로 특정 사용자/머신 필터링

#### Export Data (`/admin/export`)

- 스코어보드 내보내기 (CSV)
- 제출 기록 내보내기 (CSV)

**사용 방법:**

1. "Export Rankings" 버튼 클릭하여 스코어보드 다운로드
2. "Export Submissions" 버튼 클릭하여 제출 기록 다운로드

#### Analytics (`/admin/analytics`)

- 시스템 통계 및 분석
- 사용자 활동 분석

## Quick Actions

### Create Machine

새 활성 머신을 빠르게 생성합니다.

### Monitoring

시스템 모니터링 페이지로 이동합니다.

### Export

데이터 내보내기 페이지로 이동합니다.

## 머신 생성 가이드

### 1. 기본 정보 입력

- **Title**: 머신 제목 (예: "SokopwnRev")
- **Description**: 마크다운 형식의 설명
- **Type**: 머신 타입 선택
  - `STATIC_ATTACHMENT`: 정적 첨부 파일
  - `DYNAMIC_ATTACHMENT`: 동적 첨부 파일
  - `STATIC_CONTAINER`: 정적 컨테이너
  - `DYNAMIC_CONTAINER`: 동적 컨테이너
- **Category**: 카테고리 (pwn, web, crypto 등)

### 2. 점수 설정

- **Score**: 초기 점수
- **Difficulty Factor**: 난이도 계수 (동적 점수 계산에 사용)
- **Minimum Score Ratio**: 최소 점수 비율 (0-100%)
- **Blood Bonus**: First Blood 보너스 활성화 여부

### 3. Challenge 설정

- **Flag Template**: 동적 플래그 템플릿 (예: "flag{xxx}")
- **Attachment URL**: 첨부 파일 URL (정적/동적 첨부용)
- **Static Flags**: 정적 플래그 목록 (쉼표로 구분)

### 4. 컨테이너 설정

- **Container Image**: Docker 이미지 이름
- **Service Port**: 서비스 포트
- **CPU Limit**: CPU 제한 (0.1 CPU 단위)
- **Memory Limit**: 메모리 제한 (MB)

### 5. 생성

"Create" 버튼을 클릭하여 머신을 생성합니다. 정적 타입 머신의 경우 설정한 정적 플래그가 자동으로 생성됩니다.

## 플래그 관리 가이드

### 정적 플래그

- 정적 첨부/컨테이너 타입 머신에 사용
- 모든 사용자가 동일한 플래그 사용
- 머신 생성 시 또는 Flag Management 페이지에서 추가 가능

### 동적 플래그

- 동적 첨부/컨테이너 타입 머신에 사용
- 팀별 또는 사용자별로 고유한 플래그 생성
- 플래그 템플릿을 사용하여 자동 생성

## 팀 관리 가이드

### 팀 생성

1. 사용자가 팀 생성 API 호출
2. 시스템이 고유한 초대 코드 생성
3. 다른 사용자가 초대 코드로 팀 가입

### 초대 코드 관리

- Admin Dashboard에서 모든 팀의 초대 코드 확인 가능
- 초대 코드 복사 기능 제공

## 작성물 검토 가이드

### 검토 프로세스

1. 사용자가 작성물 제출
2. Admin Dashboard에서 "Writeup Review" 페이지 접근
3. 작성물 내용 확인
4. 승인 또는 거부 결정
5. 선택적으로 코멘트 추가

### 일괄 다운로드

- 모든 승인된 작성물을 ZIP 파일로 다운로드
- 대회 종료 후 자료 수집에 유용

## 모니터링 가이드

### 제출 기록 모니터링

- 모든 플래그 제출 기록 실시간 확인
- First Blood 확인
- 정답/오답 구분
- 점수 획득 내역

### 이벤트 로그

- 시스템 이벤트 기록
- 사용자 활동 추적
- 머신 관련 이벤트
- 팀 관련 이벤트

## 데이터 내보내기

### 스코어보드 내보내기

- 현재 랭킹 데이터를 CSV 형식으로 내보내기
- 사용자별 점수, 랭크, 점수 세부 내역 포함

### 제출 기록 내보내기

- 모든 플래그 제출 기록을 CSV 형식으로 내보내기
- 제출 시간, 사용자, 머신, 플래그, 결과 포함

## 권한 관리

### 사용자 역할

- **USER**: 일반 사용자
- **LAB**: 실습 권한 사용자
- **ADMIN**: 관리자 (모든 기능 접근 가능)

### 권한 변경

1. User Management 페이지 접근
2. 사용자 선택
3. 역할 변경

## 주의사항

1. **머신 타입 변경 불가**: 머신 생성 후 타입은 변경할 수 없습니다.
2. **플래그 삭제 주의**: 플래그 삭제 시 해당 플래그로 제출한 기록은 유지되지만, 새로운 제출은 불가능합니다.
3. **동적 플래그 생성**: 동적 플래그는 팀/사용자별로 고유하게 생성되므로, 팀 수 이상의 플래그가 필요합니다.
4. **컨테이너 이미지**: 컨테이너 이미지는 머신 생성 전에 테스트하는 것을 권장합니다.

## 문제 해결

### 머신이 목록에 나타나지 않음

- `isActive` 상태 확인
- `categoryType` 확인
- 서버 재시작 필요할 수 있음

### 플래그가 생성되지 않음

- 머신 타입 확인 (정적/동적)
- 플래그 템플릿 형식 확인
- 정적 플래그의 경우 머신의 `staticFlags` 필드 확인

### 작성물이 승인되지 않음

- 작성물 상태 확인 (pending 상태만 승인 가능)
- 관리자 권한 확인
