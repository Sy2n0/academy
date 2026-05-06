# CTF 플랫폼 고도화 구현 계획

## 개요
사용자가 요청한 모든 기능을 단계적으로 구현합니다.

## 구현 단계

### Phase 1: 데이터베이스 스키마 확장 (진행 중)
- [x] MachineType enum 추가 (STATIC_ATTACHMENT, DYNAMIC_ATTACHMENT, STATIC_CONTAINER, DYNAMIC_CONTAINER)
- [x] Machine 모델 확장 (플래그 템플릿, 첨부 파일 URL 등)
- [x] MachineFlag 모델 추가 (정적/동적 플래그 관리)
- [x] FlagSubmission 모델 추가 (플래그 제출 기록)
- [x] ContainerInstance 모델 추가 (동적 컨테이너 관리)
- [ ] User 모델 확장 (isBlocked, Writeup 관계)
- [ ] Team 모델 확장 (inviteCode)
- [ ] Writeup 모델 추가
- [ ] EventLog 모델 추가

### Phase 2: 핵심 기능 구현
1. **동적 스코어링 시스템**
   - 수식 구현: `F(S, R, D, X) = ⌊S × [R + (1-R) × exp(1-X/D)]⌋`
   - First Blood 보너스 (5%, 3%, 1%)

2. **플래그 관리 시스템**
   - 정적 플래그 관리
   - 동적 플래그 생성 및 배분
   - 플래그 템플릿 지원
   - 플래그 공유 감지

3. **Machine 활성화/비활성화**
   - 실시간 활성화 상태 변경
   - 대회 중 문제 공개

### Phase 3: 팀 기능
1. 팀 생성 및 관리
2. 초대 코드 시스템
3. 팀별 점수 추이
4. 팀 그룹화

### Phase 4: 컨테이너 배포 시스템
1. Docker 기반 컨테이너 배포
2. Kubernetes 통합 (선택)
3. 다중 포트 매핑
4. 컨테이너 라이프사이클 관리

### Phase 5: 실시간 기능
1. SignalR 통합
2. 실시간 알림
3. 대회 이벤트 모니터링
4. 플래그 제출 모니터링

### Phase 6: 보안 및 인증
1. Cloudflare Turnstile 통합
2. SMTP 이메일 인증
3. 악성 등록 방지
4. 사용자 차단 기능

### Phase 7: 관리 기능
1. 3단계 권한 관리 (USER, LAB, ADMIN)
2. Writeup 수집 및 검토
3. 스코어보드 내보내기
4. 제출 기록 내보내기

### Phase 8: 모니터링 및 로깅
1. 이벤트 로그 시스템
2. 제출 기록 모니터링
3. 주요 이벤트 추적

### Phase 9: 고급 기능
1. WebSocket 프록시
2. TCP 트래픽 포워딩
3. 트래픽 캡처

### Phase 10: 인프라
1. Redis 캐시 통합
2. 객체 스토리지 (MinIO/S3) 통합

## 우선순위
1. 데이터베이스 스키마 완성
2. 동적 스코어링 시스템
3. 플래그 관리 시스템
4. 기본 팀 기능
5. 컨테이너 배포 시스템

