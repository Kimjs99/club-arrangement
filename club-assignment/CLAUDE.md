# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Important**: This project uses Next.js 16 (Turbopack). APIs, conventions, and file structure may differ from earlier versions. Check `node_modules/next/dist/docs/` before writing code and heed deprecation notices.

## Commands

```bash
npm run dev          # 개발 서버 (http://localhost:3000)
npm run build        # 프로덕션 빌드 (TypeScript 타입 검사 포함)
npm run start        # 프로덕션 서버 실행
npm run setup-sheets # Google Sheets 초기 시트 생성 (scripts/setup-sheets.mjs)
```

빌드는 타입 검사를 포함하므로 `npm run build`로 타입 오류를 확인한다.

## Architecture

### 전체 흐름

Google Sheets를 유일한 데이터 저장소로 사용한다. DB 없음. 모든 읽기/쓰기는 `lib/sheets.ts`의 함수를 통해 서비스 계정 인증으로 처리된다.

### 역할별 화면

| 역할 | 경로 | 접근 코드 |
|---|---|---|
| 담임교사 | `/submit` | `SUBMIT_CODE` |
| 동아리 담당교사 | `/download` | `DOWNLOAD_CODE` |
| 관리자 | `/admin` | `ADMIN_CODE` |

메인 페이지(`/`)에서 역할 선택 후 접근 코드 입력 → `/api/auth/verify` 검증 → `sessionStorage`에 코드 저장 → 이후 각 페이지에서 `sessionStorage` 확인. 관리자 API는 `x-admin-code` 헤더로 추가 인증.

### Google Sheets 컬럼 구조

모든 API는 아래 컬럼 순서를 기준으로 인덱스를 직접 참조한다. **컬럼 순서가 바뀌면 API 전체를 수정해야 한다.**

| 시트 | A | B | C | D | E | F |
|---|---|---|---|---|---|---|
| 마스터_학생명단 | 학년 | 반 | 번호 | 이름 | | |
| 동아리_목록 | 동아리명 | 담당교사명 | | | | |
| 동아리_배정결과 | 학년 | 반 | 번호 | 이름 | 동아리명 | 제출시각 |
| 배정_제출기록 | 제출시각 | 학년 | 반 | 담임교사명 | 학생수 | 제출횟수 |

### 데이터 레이어 (`lib/`)

- **`lib/sheets.ts`** — Google Sheets API 클라이언트. `getSheetData`, `appendRow`, `updateSheet`, `clearSheet`, `deleteRowsByCondition` 제공. `deleteRowsByCondition`은 clear 후 재입력 방식으로 행 삭제를 구현한다(Sheets API에 행 삭제 단축 경로 없음).
- **`lib/xlsx.ts`** — `exceljs`로 출석부 Excel 파일 생성. 파일 저장 없이 `Buffer`로 반환.

### API 라우트

| 엔드포인트 | 역할 |
|---|---|
| `GET /api/clubs` | 동아리 목록 + 현재 배정 인원 |
| `GET /api/students` | `?grade=&classNum=` 필터로 학생 목록 |
| `POST /api/submit` | 배정 제출. `overwrite: true` 시 기존 학급 데이터 삭제 후 재입력 |
| `GET /api/download` | `?clubName=`으로 출석부 XLSX 스트림 반환 |
| `GET /api/preview` | `?clubName=`으로 배정 학생 목록(JSON) |
| `GET /api/template` | `?grade=&classNum=`으로 배정 입력용 Excel 템플릿 생성 |
| `POST /api/parse-template` | 업로드된 xlsx 파싱 → `{number, clubName}[]` 반환 |
| `POST /api/auth/verify` | 역할별 접근 코드 검증 |
| `GET /api/admin/stats` | 전체 현황 통계 (헤더: `x-admin-code`) |
| `POST /api/admin/reset` | 특정 학급 데이터 초기화 (헤더: `x-admin-code`) |

### 타입 (`types/index.ts`)

`Student`의 고유키는 `id` 없이 `grade-classNum-number` 복합키를 사용한다. 클라이언트에서는 `` `${s.grade}-${s.classNum}-${s.number}` `` 패턴으로 생성. `Club` 식별자도 `code` 없이 `name`을 기준으로 한다.

### 환경변수 (`.env.local`)

```
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_PRIVATE_KEY   # JSON의 \n을 그대로 유지. lib/sheets.ts에서 replace(/\\n/g, '\n') 처리
GOOGLE_SHEET_ID
SUBMIT_CODE
DOWNLOAD_CODE
ADMIN_CODE
```

`GOOGLE_PRIVATE_KEY`는 값 전체를 큰따옴표로 감싸고, JSON 파일의 `private_key` 값 그대로 붙여넣는다(`"private_key":` 키 이름과 끝 쉼표 제외).
