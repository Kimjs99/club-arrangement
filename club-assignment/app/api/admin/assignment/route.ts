import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, clearSheet, updateSheet, appendRow } from '@/lib/sheets';

export async function PATCH(req: NextRequest) {
  try {
    const adminCode = req.headers.get('x-admin-code');
    if (adminCode !== process.env.ADMIN_CODE) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 });
    }

    const { grade, classNum, number, name, clubName } = await req.json();
    if (!grade || !classNum || !number) {
      return NextResponse.json({ error: '학년, 반, 번호는 필수입니다.' }, { status: 400 });
    }

    const rows = await getSheetData('동아리_배정결과');
    const header = rows[0];
    const dataRows = rows.slice(1);
    const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

    const matchIdx = dataRows.findIndex(
      (r) => Number(r[0]) === grade && Number(r[1]) === classNum && Number(r[2]) === number
    );

    if (matchIdx >= 0) {
      // 기존 행 업데이트
      dataRows[matchIdx] = [
        String(grade), String(classNum), String(number),
        name || dataRows[matchIdx][3],
        clubName, now,
      ];
      await clearSheet('동아리_배정결과');
      await updateSheet('동아리_배정결과', [header, ...dataRows]);
    } else {
      // 신규 행 추가
      await appendRow('동아리_배정결과', [grade, classNum, number, name, clubName, now]);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/assignment] Error:', err);
    return NextResponse.json({ error: '배정 변경 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
