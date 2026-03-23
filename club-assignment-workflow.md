# 학교 동아리 배정 관리 시스템 — Claude Code 워크플로우

> **프로젝트 개요**  
> 담임교사가 학급 단위로 동아리 배정 시트를 웹앱에 제출하면, Google Sheets에 집계되어 동아리 담당교사가 해당 동아리의 출석부 XLSX를 내려받는 시스템

---

## 목차

1. [기술 스택 결정](#1-기술-스택-결정)
2. [프로젝트 초기화](#2-프로젝트-초기화)
3. [Google Sheets 연동 설정](#3-google-sheets-연동-설정)
4. [데이터 모델 설계](#4-데이터-모델-설계)
5. [API 라우트 구현](#5-api-라우트-구현)
6. [담임교사 제출 화면 구현](#6-담임교사-제출-화면-구현)
7. [동아리 담당교사 다운로드 화면 구현](#7-동아리-담당교사-다운로드-화면-구현)
8. [XLSX 출석부 생성 로직](#8-xlsx-출석부-생성-로직)
9. [인증 및 권한 처리](#9-인증-및-권한-처리)
10. [배포](#10-배포)

---

## 1. 기술 스택 결정

### 확정 스택

| 역할 | 기술 |
|---|---|
| 프레임워크 | Next.js 14 (App Router) |
| 스타일링 | Tailwind CSS |
| 데이터 저장소 | Google Sheets API v4 |
| XLSX 생성 | `exceljs` |
| 인증 | Google OAuth (NextAuth.js) 또는 간단한 비밀번호 입력 |
| 배포 | Vercel |

### Claude Code 지시 프롬프트

```
Next.js 14 App Router 기반으로 학교 동아리 배정 관리 웹앱을 만들 거야.
기술 스택: Next.js, Tailwind CSS, Google Sheets API, exceljs
한국어 UI로 개발해줘.
```

---

## 2. 프로젝트 초기화

### 2-1. 프로젝트 생성

```bash
npx create-next-app@latest club-assignment --typescript --tailwind --app
cd club-assignment
```

### 2-2. 필수 패키지 설치

```bash
npm install googleapis exceljs next-auth
npm install @types/node --save-dev
```

### 2-3. 환경변수 파일 설정

`.env.local` 파일을 생성하고 아래 항목을 채운다.

```env
# Google Sheets API
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your_spreadsheet_id_here

# 앱 설정
NEXT_PUBLIC_APP_TITLE=동아리 배정 관리 시스템
ADMIN_PASSWORD=your_admin_password

# NextAuth (선택)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret
```

### 2-4. 폴더 구조

```
club-assignment/
├── app/
│   ├── page.tsx                  # 메인(역할 선택)
│   ├── submit/page.tsx           # 담임교사 제출 화면
│   ├── download/page.tsx         # 동아리 담당교사 다운로드 화면
│   └── api/
│       ├── submit/route.ts       # 배정 시트 제출 API
│       ├── clubs/route.ts        # 동아리 목록 조회 API
│       └── download/route.ts     # 출석부 XLSX 다운로드 API
├── lib/
│   ├── sheets.ts                 # Google Sheets 클라이언트
│   └── xlsx.ts                   # XLSX 생성 유틸
├── types/
│   └── index.ts                  # 타입 정의
└── .env.local
```

---

## 3. Google Sheets 연동 설정

### 3-1. Google Cloud 설정 (수동 작업)

1. Google Cloud Console → 새 프로젝트 생성
2. Google Sheets API 활성화
3. 서비스 계정 생성 → JSON 키 다운로드
4. 사용할 Google Spreadsheet에 서비스 계정 이메일을 **편집자**로 공유

### 3-2. Sheets 클라이언트 구현

`lib/sheets.ts` 파일을 아래 구조로 생성하도록 Claude Code에 요청:

```
lib/sheets.ts 파일을 만들어줘.
Google Sheets API v4를 서비스 계정으로 인증하고,
아래 4가지 함수를 export 해줘:
- getSheetData(sheetName): 특정 시트의 전체 데이터를 2차원 배열로 반환
- appendRow(sheetName, rowData): 시트에 행 추가
- updateSheet(sheetName, values): 시트 전체를 values 배열로 업데이트
- getSheetNames(): 스프레드시트의 모든 시트 이름 목록 반환
```

### 3-3. 스프레드시트 초기 구조

Google Sheets에서 아래 시트를 수동으로 생성한다.

| 시트 이름 | 용도 |
|---|---|
| `마스터_학생명단` | 전교생 이름, 학년, 반, 번호 |
| `동아리_목록` | 동아리 코드, 동아리명, 담당교사 |
| `배정_제출기록` | 제출 로그 (제출시각, 학년, 반, 담임교사명) |
| `동아리_배정결과` | 학생별 최종 배정 동아리 (집계 결과) |

---

## 4. 데이터 모델 설계

### 4-1. 타입 정의

`types/index.ts`를 아래 구조로 생성하도록 Claude Code에 요청:

```
types/index.ts에 아래 타입들을 정의해줘:

Student: 학생 정보 (id, name, grade, classNum, number)
Club: 동아리 정보 (code, name, teacherName, maxCapacity?)
AssignmentRow: 제출 데이터 한 행 (studentId, studentName, clubCode, clubName)
SubmitPayload: 담임교사 제출 데이터 (grade, classNum, teacherName, assignments: AssignmentRow[])
AttendanceSheet: 출석부 데이터 (club, students: Student[])
```

### 4-2. 스프레드시트 컬럼 규격

**`마스터_학생명단` 시트**

```
A: 학번(또는 ID)  B: 이름  C: 학년  D: 반  E: 번호
```

**`동아리_목록` 시트**

```
A: 동아리코드  B: 동아리명  C: 담당교사명  D: 정원(선택)
```

**`동아리_배정결과` 시트** (API가 자동 생성·업데이트)

```
A: 학번  B: 이름  C: 학년  D: 반  E: 번호  F: 동아리코드  G: 동아리명  H: 제출시각
```

---

## 5. API 라우트 구현

### 5-1. 배정 제출 API

`app/api/submit/route.ts`를 아래 스펙으로 구현하도록 Claude Code에 요청:

```
app/api/submit/route.ts POST 핸들러를 만들어줘.
요청 body: SubmitPayload 타입
처리 순서:
  1. 입력값 유효성 검사 (학년, 반, 교사명 필수)
  2. 중복 제출 여부 확인 (같은 학년+반이 이미 제출했는지 배정결과 시트에서 체크)
  3. 중복이면 덮어쓸지 묻는 에러 반환 (overwrite: true 파라미터로 재요청 시 허용)
  4. 배정결과 시트에 학생별로 행 append
  5. 배정_제출기록 시트에 제출 로그 append
  6. 성공 응답 반환
```

### 5-2. 동아리 목록 조회 API

```
app/api/clubs/route.ts GET 핸들러를 만들어줘.
동아리_목록 시트에서 전체 동아리 목록을 읽어 JSON 배열로 반환.
각 동아리에 현재 배정된 학생 수(currentCount)도 포함해줘.
```

### 5-3. 출석부 다운로드 API

```
app/api/download/route.ts GET 핸들러를 만들어줘.
쿼리 파라미터: clubCode (동아리 코드)
처리 순서:
  1. 동아리_배정결과 시트에서 해당 clubCode의 학생 목록 필터링
  2. lib/xlsx.ts의 generateAttendanceSheet() 호출
  3. 응답 헤더에 Content-Disposition: attachment 설정
  4. XLSX 버퍼를 binary 응답으로 반환
```

---

## 6. 담임교사 제출 화면 구현

### 6-1. 화면 구성

`app/submit/page.tsx`를 아래 스펙으로 구현하도록 Claude Code에 요청:

```
담임교사 동아리 배정 제출 페이지를 만들어줘.

상단 입력 영역:
- 학년 선택 (1/2/3학년 버튼)
- 반 선택 (1~10반 버튼)
- 담임교사 이름 입력

학생 배정 테이블:
- 마스터_학생명단에서 해당 학년+반 학생 자동 로드
- 각 행: 번호 | 이름 | 동아리 선택 드롭다운
- 동아리 목록은 /api/clubs에서 가져옴

하단:
- 전체 배정 현황 요약 (동아리별 배정 인원)
- 제출 버튼 → 확인 다이얼로그 → /api/submit 호출
- 제출 완료 시 성공 메시지 표시

스타일: Tailwind, 학교 현장에서 사용하기 쉬운 심플한 UI
```

### 6-2. 편의 기능 추가 요청

```
submit 페이지에 아래 편의 기능을 추가해줘:
- 동아리 일괄 배정: 여러 학생 선택 후 한 번에 같은 동아리 지정
- CSV/엑셀 파일로 배정 결과 미리 업로드 기능
- 배정되지 않은 학생(미배정) 수 실시간 표시
- 제출 전 미배정 학생이 있으면 경고 표시
```

---

## 7. 동아리 담당교사 다운로드 화면 구현

### 7-1. 화면 구성

`app/download/page.tsx`를 아래 스펙으로 구현하도록 Claude Code에 요청:

```
동아리 담당교사 출석부 다운로드 페이지를 만들어줘.

검색 영역:
- 동아리명 검색 입력창 (자동완성)
- 동아리 목록 카드 그리드 (동아리명, 담당교사, 현재 배정 인원 표시)

선택한 동아리 미리보기:
- 배정된 학생 목록 테이블 (학년/반/번호/이름)
- 학생 수 요약

다운로드 버튼:
- "출석부 XLSX 다운로드" 버튼 → /api/download?clubCode=xxx 호출
- 로딩 스피너 표시

스타일: Tailwind, 명확한 정보 계층
```

---

## 8. XLSX 출석부 생성 로직

### 8-1. 출석부 양식 구현

`lib/xlsx.ts`를 아래 스펙으로 구현하도록 Claude Code에 요청:

```
lib/xlsx.ts에 generateAttendanceSheet(attendanceData: AttendanceSheet) 함수를 만들어줘.
exceljs 라이브러리 사용.

출석부 양식:
- 1행: "○○ 동아리 출석부" (병합 셀, 큰 글씨)
- 2행: 담당교사명, 작성일
- 3행: 빈 행
- 4행 헤더: 번호 | 학년 | 반 | 학번 | 이름 | 1월 | 2월 | ... | 12월 (월별 출석 체크 열)
  (또는 날짜별 열 - 월 2회 기준 연간 20열)
- 5행~: 학생 데이터 (학년+반 순 정렬)

스타일:
- 헤더 행: 연한 파란색 배경, 볼드
- 학생 행: 홀짝 줄 다른 색
- 모든 셀 테두리
- 열 너비 자동 조정

Buffer로 반환 (파일 저장 없이 메모리에서 처리)
```

### 8-2. 출석부 확장 옵션

```
generateAttendanceSheet에 options 파라미터를 추가해줘:
- attendanceCols: 출석 체크 열 개수 (기본 20)
- includeSignatureRow: 서명란 행 포함 여부
- includePhotoColumn: 사진 열 포함 여부
- sortBy: 'grade' | 'name' (정렬 기준)
```

---

## 9. 인증 및 권한 처리

### 9-1. 간단한 비밀번호 방식 (1차 구현)

```
app/page.tsx에 역할 선택 + 간단한 접근 제어를 추가해줘.

메인 페이지:
- "담임교사 배정 제출" 버튼 → 학교 코드 입력 모달 → 일치하면 /submit 이동
- "동아리 출석부 다운로드" 버튼 → 교사 확인 코드 입력 → /download 이동

환경변수에서 SUBMIT_CODE, DOWNLOAD_CODE를 읽어 비교.
세션 스토리지에 인증 상태 저장 (새로고침 후 유지).
```

### 9-2. 제출 중복 방지 로직

```
/api/submit에서 중복 제출 처리를 강화해줘.
- 동일 학년+반의 기존 데이터를 삭제 후 재입력하는 방식으로 overwrite 처리
- 제출 기록에 제출 횟수와 마지막 제출 시각 업데이트
- 관리자 전용 /api/admin/reset 엔드포인트: 특정 학년+반 데이터 초기화
```

---

## 10. 배포

### 10-1. Vercel 배포 준비

```
배포 전 체크리스트를 작성해줘:
- .env.local의 모든 환경변수가 Vercel 프로젝트에 설정되었는지
- Google 서비스 계정 PRIVATE_KEY의 줄바꿈 처리 (\n → 실제 줄바꿈)
- next.config.js에서 불필요한 외부 도메인 허용 설정 제거
```

### 10-2. Vercel 환경변수 설정

Vercel 대시보드 → Settings → Environment Variables에 아래 항목 추가:

```
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_PRIVATE_KEY          ← 값에서 \n을 실제 개행으로 붙여넣기
GOOGLE_SHEET_ID
SUBMIT_CODE
DOWNLOAD_CODE
NEXTAUTH_SECRET             (사용 시)
```

### 10-3. 배포 및 테스트

```bash
# 로컬 최종 테스트
npm run build
npm run start

# Vercel 배포
npx vercel --prod
```

### 10-4. 최종 동작 검증 체크리스트

- [ ] 메인 페이지 역할 선택 화면 정상 표시
- [ ] 담임교사: 학년+반 선택 시 학생 목록 정상 로드
- [ ] 담임교사: 동아리 드롭다운 목록 정상 표시
- [ ] 담임교사: 배정 제출 → Sheets에 데이터 저장 확인
- [ ] 동아리 담당교사: 동아리 검색 정상 작동
- [ ] 동아리 담당교사: XLSX 다운로드 파일 정상 열림
- [ ] 동일 학년+반 중복 제출 시 덮어쓰기 처리 정상
- [ ] 모바일 화면에서 UI 정상 표시

---

## 개발 순서 요약

```
Phase 1: 기반 구축
  → 프로젝트 초기화 → 환경변수 설정 → Google Sheets 연동 확인

Phase 2: 데이터 레이어
  → 스프레드시트 시트 구조 생성 → 마스터 데이터 입력 → API 라우트 구현

Phase 3: UI 구현
  → 메인 페이지 → 담임교사 제출 화면 → 동아리 담당교사 다운로드 화면

Phase 4: XLSX 출력
  → 출석부 양식 구현 → 다운로드 연동 테스트

Phase 5: 배포
  → Vercel 환경변수 설정 → 배포 → 실사용 테스트
```

---

> **팁**: Claude Code에서 각 Phase별로 하나씩 지시하고, 완성 후 다음 단계로 진행하는 것을 권장합니다.  
> Google Sheets 데이터 연동 확인은 Phase 2 완료 직후 콘솔 로그로 먼저 검증하세요.
