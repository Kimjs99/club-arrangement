import { google } from 'googleapis';

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;

function getAuth() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return auth;
}

async function getSheetsClient() {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}

/** 특정 시트의 전체 데이터를 2차원 배열로 반환 */
export async function getSheetData(sheetName: string): Promise<string[][]> {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: sheetName,
  });
  return (res.data.values as string[][]) || [];
}

/** 시트에 행 추가 */
export async function appendRow(sheetName: string, rowData: (string | number)[]): Promise<void> {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: sheetName,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [rowData] },
  });
}

/** 시트 전체를 values 배열로 업데이트 */
export async function updateSheet(sheetName: string, values: (string | number)[][]): Promise<void> {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

/** 시트의 특정 범위 데이터를 삭제 (clear) */
export async function clearSheet(sheetName: string): Promise<void> {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: sheetName,
  });
}

/** 스프레드시트의 모든 시트 이름 목록 반환 */
export async function getSheetNames(): Promise<string[]> {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.get({
    spreadsheetId: SHEET_ID,
  });
  return res.data.sheets?.map((s) => s.properties?.title ?? '') ?? [];
}

/** 특정 조건으로 행 삭제 후 재입력 (overwrite) */
export async function deleteRowsByCondition(
  sheetName: string,
  conditionFn: (row: string[]) => boolean
): Promise<void> {
  const data = await getSheetData(sheetName);
  if (data.length === 0) return;

  const header = data[0];
  const filtered = data.filter((row, idx) => idx === 0 || !conditionFn(row));

  await clearSheet(sheetName);
  if (filtered.length > 0) {
    await updateSheet(sheetName, filtered);
  } else {
    // 헤더만 복원
    await updateSheet(sheetName, [header]);
  }
}
