import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, clearSheet, updateSheet, deleteRowsByCondition, appendRows } from '@/lib/sheets';

export async function POST(req: NextRequest) {
  try {
    const adminCode = req.headers.get('x-admin-code');
    if (adminCode !== process.env.ADMIN_CODE) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 });
    }

    const { backupName } = await req.json();
    if (!backupName || !backupName.startsWith('백업_')) {
      return NextResponse.json({ error: '올바르지 않은 백업 이름입니다.' }, { status: 400 });
    }

    const rows = await getSheetData(backupName);
    if (rows.length === 0) {
      return NextResponse.json({ error: '백업 데이터가 비어있습니다.' }, { status: 400 });
    }

    // 섹션 파싱: ===시트명=== 마커로 구분
    const sections: Record<string, string[][]> = {};
    let currentSection = '';
    for (const row of rows) {
      const cell = row[0] ?? '';
      if (cell.startsWith('===') && cell.endsWith('===')) {
        currentSection = cell.slice(3, -3);
        sections[currentSection] = [];
      } else if (currentSection) {
        sections[currentSection].push(row);
      }
    }

    // 백업 종류 판단: 전체 vs 학급
    const parts = backupName.split('_');
    const label = parts.slice(1, -2).join('_');

    if (label === '전체') {
      // 전체 복원: 3개 시트 모두 교체
      for (const [sheetName, data] of Object.entries(sections)) {
        if (data.length === 0) continue;
        await clearSheet(sheetName);
        await updateSheet(sheetName, data);
      }
    } else {
      // 학급 복원: 동아리_배정결과의 해당 학급 행만 교체
      const data = sections['동아리_배정결과'];
      if (!data || data.length <= 1) {
        return NextResponse.json({ error: '복원할 데이터가 없습니다.' }, { status: 400 });
      }
      const dataRows = data.slice(1); // 헤더 제외
      const grade = Number(dataRows[0][0]);
      const classNum = Number(dataRows[0][1]);

      await deleteRowsByCondition(
        '동아리_배정결과',
        (row) => Number(row[0]) === grade && Number(row[1]) === classNum
      );
      await appendRows('동아리_배정결과', dataRows);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/restore] Error:', err);
    return NextResponse.json({ error: '복원 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
