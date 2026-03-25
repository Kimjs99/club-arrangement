import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // SheetJS: .xls(한셀 등) 및 .xlsx 모두 지원
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch {
      return NextResponse.json(
        { error: '파일을 읽을 수 없습니다. .xlsx 또는 .xls 형식인지 확인하세요.' },
        { status: 400 }
      );
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ error: '시트를 찾을 수 없습니다.' }, { status: 400 });
    }

    // 2차원 배열로 변환 (헤더 없이 raw 배열)
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
      header: 1,
      defval: '',
    });

    // 헤더 행 찾기: 첫 번째 셀이 "번호"인 행
    const headerRowIdx = rows.findIndex(
      (row) => String(row[0] ?? '').trim() === '번호'
    );

    if (headerRowIdx < 0) {
      return NextResponse.json(
        { error: '템플릿 형식이 올바르지 않습니다. (번호 헤더 없음)' },
        { status: 400 }
      );
    }

    const results: { number: number; name: string; clubName: string }[] = [];
    let filledCount = 0;

    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      const numVal = row[0];
      const nameVal = row[1];
      const clubVal = row[2];

      const num = typeof numVal === 'number' ? numVal : parseInt(String(numVal ?? ''));
      const name = String(nameVal ?? '').trim();
      const clubName = String(clubVal ?? '').trim();

      if (!isNaN(num) && num > 0 && name) {
        results.push({ number: num, name, clubName });
        if (clubName) filledCount++;
      }
    }

    if (results.length === 0) {
      return NextResponse.json(
        { error: '학생 데이터가 없습니다. 올바른 템플릿인지 확인하세요.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ assignments: results, filledCount, totalCount: results.length });
  } catch (err) {
    console.error('[parse-template] Error:', err);
    return NextResponse.json({ error: '파일 파싱 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
