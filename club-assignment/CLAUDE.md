# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # 개발 서버 (http://localhost:3000)
npm run build        # 프로덕션 빌드 (TypeScript 타입 검사 포함)
npm run start        # 프로덕션 서버 실행
npm run setup-sheets # Google Sheets 초기 시트 생성 (scripts/setup-sheets.mjs)
```

`npm run build`로 TypeScript 타입 오류를 확인한다 (lint도 포함됨).

## 기술 스택

- **Next.js 16.2.1** (App Router, Turbopack), React 19, TypeScript
- **Tailwind CSS v4** — `@tailwind` 디렉티브 없이 `@import "tailwindcss"` 방식 사용
- **Google Sheets API v4** — 서비스 계정 인증, DB 없음
- **exceljs** — 서버사이드 Excel 파일 생성/파싱
- **Vercel** 배포

## Architecture

### 전체 흐름

Google Sheets를 유일한 데이터 저장소로 사용한다. DB 없음. 모든 읽기/쓰기는 `lib/sheets.ts`의 함수를 통해 서비스 계정 인증으로 처리된다.

**마스터 시트 사전 입력 불필요**: 담임교사가 템플릿을 통해 학생 이름을 입력하면 제출 시 `마스터_학생명단`에 자동 upsert된다. `동아리_목록`만 사전 입력하면 된다.

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

- **`lib/sheets.ts`** — Google Sheets API 클라이언트. `getSheetData`, `appendRow`, `appendRows`(배치), `updateSheet`, `clearSheet`, `deleteRowsByCondition`, `createSheetWithData`, `getSheetIdByName`, `deleteSheetById`, `listBackupSheets` 제공. `deleteRowsByCondition`은 clear 후 재입력 방식으로 행 삭제를 구현한다(Sheets API에 행 삭제 단축 경로 없음).
- **`lib/xlsx.ts`** — `exceljs`로 출석부 Excel 파일 생성. 컬럼 순서: 학년/반/번호/이름 + 차시열(1차시~N차시). 행5는 날짜 기입란(`/` 기본값). 파일 저장 없이 `Buffer`로 반환.

### API 라우트

| 엔드포인트 | 역할 |
|---|---|
| `GET /api/clubs` | 동아리 목록 + 현재 배정 인원 |
| `GET /api/students` | `?grade=&classNum=` 필터로 학생 목록 |
| `POST /api/submit` | 배정 제출. `overwrite: true` 시 기존 학급 데이터 삭제 후 재입력. 제출 후 마스터_학생명단 자동 upsert |
| `GET /api/download` | `?clubName=`으로 출석부 XLSX 스트림 반환 |
| `GET /api/preview` | `?clubName=`으로 배정 학생 목록(JSON) |
| `GET /api/template` | `?grade=&classNum=`으로 배정 입력용 Excel 템플릿 생성. 마스터 시트에 학생 없으면 50행 빈 템플릿(이름 입력 가능) |
| `POST /api/parse-template` | 업로드된 xlsx 파싱 → `{number, name, clubName}[]` 반환 |
| `POST /api/auth/verify` | 역할별 접근 코드 검증 |
| `GET /api/admin/stats` | 전체 현황 통계 (헤더: `x-admin-code`) |
| `POST /api/admin/reset` | 특정 학급 데이터 초기화 (헤더: `x-admin-code`) |
| `POST /api/admin/reset-all` | 전체 데이터 삭제 — 마스터_학생명단·동아리_배정결과·배정_제출기록 (헤더: `x-admin-code`) |
| `GET /api/admin/class` | `?grade=&classNum=` 학급 학생 목록 + 현재 동아리 배정 조인 (헤더: `x-admin-code`) |
| `POST /api/admin/student` | 학생 추가 → 마스터_학생명단 append (헤더: `x-admin-code`) |
| `PATCH /api/admin/assignment` | 학생 동아리 변경 → 동아리_배정결과 행 업데이트 또는 신규 추가 (헤더: `x-admin-code`) |
| `GET /api/admin/backups` | 백업 시트 목록 반환 (헤더: `x-admin-code`) |
| `DELETE /api/admin/backups` | `?name=` 백업 시트 삭제 (헤더: `x-admin-code`) |
| `POST /api/admin/restore` | 백업 시트에서 데이터 복원 (헤더: `x-admin-code`) |

### 관리자 페이지 (`/admin`) 탭 구조

| 탭 | 기능 |
|---|---|
| 현황판 | 배정률·미제출 학급·동아리별 집계·최근 제출 기록 |
| 학생/배정 관리 | 학급 선택 → 학생 목록 조회, 학생 추가(2단계 확인), 배정 변경(2단계 확인) |
| 동아리 명단 | 동아리 선택 → 배정 학생 목록 확인, 출석부 XLSX 다운로드 |
| 백업/복원 | 백업 목록 확인, 2단계 복원, 백업 삭제 |

데이터 변경(학생 추가·배정 변경) 시 2단계 확인 모달 필수. 전체 삭제는 `전체삭제확인` 문구 직접 입력 필요.

**백업 동작**: `reset` / `reset-all` 호출 시 삭제 전 자동으로 백업 시트 생성. 이름 형식: `백업_전체_YYYYMMDD_HHMMSS` (전체) / `백업_1학년2반_YYYYMMDD_HHMMSS` (학급). 복원 시 전체 백업은 3개 시트 전체 교체, 학급 백업은 해당 학급 행만 교체. 타임스탬프는 KST 기준.

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
