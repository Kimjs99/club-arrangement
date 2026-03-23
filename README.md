# 동아리 배정 관리 시스템

학교 담임교사가 학급 단위로 동아리 배정을 제출하면 Google Sheets에 집계되고, 동아리 담당교사는 배정된 학생의 출석부 XLSX를 다운로드할 수 있는 웹 애플리케이션입니다.

## 주요 기능

| 역할 | 기능 |
|---|---|
| **담임교사** | 학년·반 선택 → 학생 목록 자동 로드 → 동아리 배정 → 제출 |
| | 템플릿 Excel 다운로드 → 작성 후 업로드로 일괄 입력 |
| | 체크박스로 여러 학생 선택 후 동아리 일괄 지정 |
| **동아리 담당교사** | 동아리 검색 → 배정 학생 명렬 미리보기 → XLSX 출석부 다운로드 |
| **관리자** | 전체 배정률 현황판, 미제출 학급 목록, 동아리별 집계, 학급 데이터 초기화 |

## 기술 스택

- **프레임워크**: Next.js 16 (App Router, Turbopack)
- **스타일링**: Tailwind CSS v4
- **데이터 저장소**: Google Sheets API v4 (서비스 계정 인증)
- **Excel 생성/파싱**: exceljs
- **배포**: Vercel

## 시작하기

### 1. 의존성 설치

```bash
cd club-assignment
npm install
```

### 2. Google Cloud 설정

1. [Google Cloud Console](https://console.cloud.google.com) → 프로젝트 생성
2. Google Sheets API 활성화
3. 서비스 계정 생성 → JSON 키 다운로드
4. Google Spreadsheet 생성 후 서비스 계정 이메일을 **편집자**로 공유

### 3. 환경변수 설정

`club-assignment/.env.local` 파일 생성:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@xxx.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=스프레드시트_ID

SUBMIT_CODE=담임교사_접근코드
DOWNLOAD_CODE=담당교사_접근코드
ADMIN_CODE=관리자_접근코드
```

> `GOOGLE_PRIVATE_KEY`는 JSON 키 파일의 `private_key` 값을 큰따옴표로 감싸서 입력합니다. `\n`은 그대로 둡니다.

### 4. Google Sheets 초기화

```bash
npm run setup-sheets
```

아래 4개 시트가 자동 생성됩니다.

| 시트 | 컬럼 |
|---|---|
| 마스터_학생명단 | 학년 / 반 / 번호 / 이름 |
| 동아리_목록 | 동아리명 / 담당교사명 |
| 동아리_배정결과 | 학년 / 반 / 번호 / 이름 / 동아리명 / 제출시각 |
| 배정_제출기록 | 제출시각 / 학년 / 반 / 담임교사명 / 학생수 / 제출횟수 |

시트 생성 후 `마스터_학생명단`과 `동아리_목록`에 실제 데이터를 입력합니다.

### 5. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) 접속

## 배포 (Vercel)

```bash
npx vercel --prod
```

Vercel 대시보드 → Settings → Environment Variables에 `.env.local`의 모든 항목을 추가합니다. `GOOGLE_PRIVATE_KEY`는 값에서 `\n`을 실제 줄바꿈으로 붙여넣습니다.
