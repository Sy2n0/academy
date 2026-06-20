# SQL Injection 공격 이해하기

## 개요

SQL Injection은 웹 애플리케이션에서 가장 흔한 보안 취약점 중 하나입니다. 이번 강의에서는 SQL Injection의 원리와 방어 방법을 학습합니다.

## 1. SQL Injection이란?

SQL Injection은 악의적인 SQL 코드를 애플리케이션의 입력 필드에 삽입하여 데이터베이스를 조작하는 공격 기법입니다.

### 기본 예시

일반적인 로그인 쿼리는 다음과 같습니다:

```sql
SELECT * FROM users WHERE username = 'admin' AND password = 'password123'
```

하지만 입력값 검증이 제대로 되지 않으면 공격자가 다음과 같은 페이로드를 입력할 수 있습니다:

[sqli:SELECT * FROM users WHERE id = ']

위 예시에서 `1' OR '1'='1`을 입력하면 어떻게 될까요? 직접 테스트해보세요!

## 2. 암호화 기초

보안을 위해서는 민감한 데이터를 암호화해야 합니다. 다양한 인코딩 방법을 살펴보겠습니다.

### Base64 인코딩

[crypto:base64|Hello World]

### Hex 인코딩

[crypto:hex|Secret Message]

### URL 인코딩

[crypto:url:https://example.com/search?q=hello world]

## 3. 실습: 코드 실행

다음 Python 코드를 실행해보세요:

[run:python]
def check_sql_injection(input_string):
dangerous_keywords = ["'", "OR", "UNION", "--", ";", "DROP"]
for keyword in dangerous_keywords:
if keyword.upper() in input_string.upper():
return True, f"⚠️ Dangerous keyword detected: {keyword}"
return False, "✓ Input appears safe"

# 테스트

test_inputs = [
"admin",
"admin' OR '1'='1",
"'; DROP TABLE users; --"
]

for test in test_inputs:
is_vulnerable, message = check_sql_injection(test)
print(f"Input: {test}")
print(f"Result: {message}\n")
[/run]

## 4. XSS 공격 이해

Cross-Site Scripting (XSS)은 악의적인 스크립트를 웹 페이지에 삽입하는 공격입니다.

### XSS 페이로드 테스트

[xss:<script>alert('XSS Attack!')</script>]

[xss:<img src=x onerror=alert('XSS')>]

## 5. 네트워크 보안

### 포트 스캔 시뮬레이션

일반적인 웹 서버 포트를 스캔해보겠습니다:

[portscan:localhost|80-90]

### HTTP 요청 분석

다음 URL의 Request/Response 헤더를 확인해보세요:

[url:https://httpbin.org/get]

## 6. 헥스 덤프 분석

바이너리 데이터를 헥스 덤프 형식으로 확인해보겠습니다:

[hexdump:SQL Injection Payload]

## 7. 퀴즈

다음 문제를 풀어보세요:

[quiz:SQL Injection 공격을 방어하는 가장 좋은 방법은?|입력값 검증|암호화|방화벽 설정|0]

[quiz:다음 중 XSS 공격에 취약한 코드는?|<div>{userInput}</div>|<div>{sanitizedInput}</div>|<div>Static Content</div>|0]

## 8. 체크리스트

다음 항목들을 완료해보세요:

[checklist:SQL Injection의 원리 이해|XSS 공격 이해|암호화 기초 학습|포트 스캔 이해|로그 분석 기초]

## 9. 터미널 실습

다음 명령어들을 실행해보세요:

[terminal]
echo "SQL Injection Test"
echo "SELECT \* FROM users WHERE id = '1' OR '1'='1'"
[/terminal]

## 10. JSON 데이터 처리

API 응답 데이터를 포맷팅해보세요:

[json:{"status":"success","data":{"user_id":123,"username":"admin","email":"admin@example.com"},"timestamp":"2024-01-01T00:00:00Z"}]

## 11. 로그 분석 실습

다음 로그를 분석해보세요:

[loganalyzer:2024-01-01 10:00:00 INFO: User login successful
2024-01-01 10:01:00 ERROR: Database connection failed
2024-01-01 10:02:00 WARNING: Unusual activity detected
2024-01-01 10:03:00 INFO: User logout successful
2024-01-01 10:04:00 ERROR: SQL syntax error
2024-01-01 10:05:00 WARNING: Multiple failed login attempts]

## 12. 패킷 분석

네트워크 패킷을 분석해보세요:

[packet:4500003c1c4640004006b1e6c0a80064c0a80001]

## 13. API 테스트

다음 API를 테스트해보세요:

[api:https://httpbin.org/post|POST|{"Content-Type":"application/json"}|{"username":"admin","password":"test123"}]

## 결론

이번 강의를 통해 다음을 학습했습니다:

- ✅ SQL Injection 공격의 원리와 방어 방법
- ✅ XSS 공격의 이해
- ✅ 암호화 및 인코딩 기초
- ✅ 네트워크 보안 기초
- ✅ 로그 분석 기초

다음 강의에서는 더 심화된 보안 주제를 다룰 예정입니다.
