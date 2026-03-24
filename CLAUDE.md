# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 구조

소스 코드와 상세 가이드는 `club-assignment/` 하위 디렉토리에 있다. 대부분의 작업은 해당 디렉토리 안에서 이루어진다.

```
club-arrangement/           ← 레포 루트 (여기)
├── club-assignment/        ← Next.js 앱 (실제 코드)
│   ├── CLAUDE.md           ← 상세 아키텍처·API 가이드
│   ├── app/                ← Next.js App Router
│   ├── lib/                ← Google Sheets / Excel 유틸
│   ├── types/              ← TypeScript 타입 정의
│   └── package.json
├── CHANGELOG.md
└── README.md               ← 배포·환경변수 설정 가이드
```

## 명령어

`club-assignment/` 디렉토리에서 실행:

```bash
npm run dev          # 개발 서버 (http://localhost:3000)
npm run build        # 프로덕션 빌드 + TypeScript 타입 검사
npm run setup-sheets # Google Sheets 초기 시트 생성
```

## 핵심 아키텍처 요약

**화접중학교 창체동아리 배정 관리 시스템** — 담임교사가 학생 동아리 배정을 제출하고 관리자가 현황을 관리하는 Next.js 웹 앱.

- **데이터 저장소**: Google Sheets만 사용 (DB 없음). 모든 읽기/쓰기는 `lib/sheets.ts`를 통해 서비스 계정 인증으로 처리.
- **역할**: 담임교사(`/submit`) · 동아리담당교사(`/download`) · 관리자(`/admin`) — 각 역할별 접근 코드로 인증, `sessionStorage`에 저장.
- **버전 관리**: `package.json`의 `version` 필드 변경 시 푸터에 자동 반영.

상세 아키텍처, Google Sheets 컬럼 구조, API 목록, 환경변수 설정은 **`club-assignment/CLAUDE.md`** 참고.
