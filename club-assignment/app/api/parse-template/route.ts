import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(arrayBuffer as any);

    // 첫 번째 시트 파싱 (배정입력 시트)
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return NextResponse.json({ error: '시트를 찾을 수 없습니다.' }, { status: 400 });
    }

    // 헤더 행 찾기: "번호"가 있는 행
    let headerRowNum = -1;
    sheet.eachRow((row, rowNum) => {
      const first = row.getCell(1).value?.toString().trim();
      if (first === '번호') headerRowNum = rowNum;
    });

    if (headerRowNum < 0) {
      return NextResponse.json({ error: '템플릿 형식이 올바르지 않습니다. (번호 헤더 없음)' }, { status: 400 });
    }

    const results: { number: number; name: string; clubName: string }[] = [];
    let filledCount = 0;

    sheet.eachRow((row, rowNum) => {
      if (rowNum <= headerRowNum) return;

      const numVal = row.getCell(1).value;
      const nameVal = row.getCell(2).value;
      const clubVal = row.getCell(3).value;

      const num = typeof numVal === 'number' ? numVal : parseInt(String(numVal ?? ''));
      const name = nameVal?.toString().trim() ?? '';
      const clubName = clubVal?.toString().trim() ?? '';

      if (!isNaN(num) && num > 0) {
        results.push({ number: num, name, clubName });
        if (clubName) filledCount++;
      }
    });

    if (results.length === 0) {
      return NextResponse.json({ error: '학생 데이터가 없습니다. 올바른 템플릿인지 확인하세요.' }, { status: 400 });
    }

    return NextResponse.json({ assignments: results, filledCount, totalCount: results.length });
  } catch (err) {
    console.error('[parse-template] Error:', err);
    return NextResponse.json({ error: '파일 파싱 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
