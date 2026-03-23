/**
 * Google Sheets 초기 설정 스크립트
 * 실행: node scripts/setup-sheets.mjs
 *
 * .env.local에 아래 값이 있어야 합니다:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_PRIVATE_KEY
 *   GOOGLE_SHEET_ID
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

// .env.local 수동 파싱 (dotenv 없이도 동작)
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dir, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx < 0) continue;
  const key = trimmed.slice(0, idx).trim();
  let val = trimmed.slice(idx + 1).trim();
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  env[key] = val.replace(/\\n/g, '\n');
}

const SHEET_ID = env.GOOGLE_SHEET_ID;
if (!SHEET_ID || SHEET_ID === 'your_spreadsheet_id_here') {
  console.error('❌ .env.local에 GOOGLE_SHEET_ID를 먼저 설정하세요.');
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: env.GOOGLE_PRIVATE_KEY,
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// ─── 필요한 시트 정의 ───────────────────────────────────────────────────────

const REQUIRED_SHEETS = [
  {
    title: '마스터_학생명단',
    headers: ['학년', '반', '번호', '이름'],
    sampleRows: [
      [1, 1, 1, '홍길동'],
      [1, 1, 2, '김철수'],
      [1, 1, 3, '이영희'],
      [1, 2, 1, '박민준'],
      [1, 2, 2, '최지우'],
    ],
    frozenRows: 1,
    columnWidths: [80, 80, 80, 120],
  },
  {
    title: '동아리_목록',
    headers: ['동아리명', '담당교사명'],
    sampleRows: [
      ['축구부', '김선생'],
      ['농구부', '이선생'],
      ['밴드부', '박선생'],
      ['미술부', '최선생'],
      ['독서부', '정선생'],
    ],
    frozenRows: 1,
    columnWidths: [150, 120],
  },
  {
    title: '동아리_배정결과',
    headers: ['학년', '반', '번호', '이름', '동아리명', '제출시각'],
    sampleRows: [],
    frozenRows: 1,
    columnWidths: [70, 70, 70, 120, 150, 180],
  },
  {
    title: '배정_제출기록',
    headers: ['제출시각', '학년', '반', '담임교사명', '학생수', '제출횟수', '구분'],
    sampleRows: [],
    frozenRows: 1,
    columnWidths: [180, 70, 70, 120, 80, 80, 80],
  },
];

// ─── 유틸리티 ───────────────────────────────────────────────────────────────

function columnLetter(n) {
  let result = '';
  while (n > 0) {
    n--;
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result;
}

// ─── 메인 ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔗 Google Sheets 연결 중...');

  // 현재 스프레드시트 정보 조회
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const existingSheets = spreadsheet.data.sheets.map((s) => s.properties.title);
  console.log(`📄 스프레드시트: ${spreadsheet.data.properties.title}`);
  console.log(`   기존 시트: ${existingSheets.join(', ') || '(없음)'}\n`);

  const requests = [];

  for (const def of REQUIRED_SHEETS) {
    if (existingSheets.includes(def.title)) {
      console.log(`⏭  "${def.title}" — 이미 존재, 건너뜀`);
      continue;
    }

    console.log(`✨ "${def.title}" — 생성 중...`);

    // 1) 시트 추가
    const addRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: def.title,
                gridProperties: {
                  frozenRowCount: def.frozenRows,
                },
              },
            },
          },
        ],
      },
    });

    const newSheetId = addRes.data.replies[0].addSheet.properties.sheetId;

    // 2) 헤더 + 샘플 데이터 입력
    const values = [def.headers, ...def.sampleRows];
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${def.title}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    // 3) 헤더 스타일 (볼드 + 배경색)
    requests.push({
      repeatCell: {
        range: {
          sheetId: newSheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: def.headers.length,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.84, green: 0.90, blue: 0.94 },
            textFormat: { bold: true, fontSize: 10 },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
      },
    });

    // 4) 열 너비 설정
    def.columnWidths.forEach((px, i) => {
      requests.push({
        updateDimensionProperties: {
          range: {
            sheetId: newSheetId,
            dimension: 'COLUMNS',
            startIndex: i,
            endIndex: i + 1,
          },
          properties: { pixelSize: px },
          fields: 'pixelSize',
        },
      });
    });

    // 5) 행 높이 (헤더)
    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId: newSheetId,
          dimension: 'ROWS',
          startIndex: 0,
          endIndex: 1,
        },
        properties: { pixelSize: 28 },
        fields: 'pixelSize',
      },
    });

    // 6) 테두리
    requests.push({
      updateBorders: {
        range: {
          sheetId: newSheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: def.headers.length,
        },
        bottom: { style: 'SOLID_MEDIUM', color: { red: 0.2, green: 0.4, blue: 0.6 } },
      },
    });

    console.log(`   ✅ 완료 (헤더 ${def.headers.length}열, 샘플 ${def.sampleRows.length}행)`);
  }

  // 일괄 스타일 적용
  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests },
    });
    console.log('\n🎨 스타일 적용 완료');
  }

  console.log('\n✅ 시트 설정 완료!');
  console.log('');
  console.log('📌 다음 단계:');
  console.log('   1. 마스터_학생명단에 전교생 데이터 입력');
  console.log('   2. 동아리_목록에 동아리 및 담당교사 입력');
  console.log('   3. npm run dev 로 서버 실행');
}

main().catch((err) => {
  console.error('\n❌ 오류:', err.message);
  if (err.message.includes('invalid_grant') || err.message.includes('DECODER')) {
    console.error('   → GOOGLE_PRIVATE_KEY 형식을 확인하세요. \\n이 실제 줄바꿈으로 변환되어야 합니다.');
  } else if (err.message.includes('403')) {
    console.error('   → 서비스 계정이 스프레드시트에 편집자로 공유되어 있는지 확인하세요.');
  } else if (err.message.includes('404')) {
    console.error('   → GOOGLE_SHEET_ID가 올바른지 확인하세요.');
  }
  process.exit(1);
});
