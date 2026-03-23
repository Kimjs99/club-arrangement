import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, deleteRowsByCondition, createSheetWithData } from '@/lib/sheets';

function kstTimestamp() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  const date = `${kst.getUTCFullYear()}${p(kst.getUTCMonth() + 1)}${p(kst.getUTCDate())}`;
  const time = `${p(kst.getUTCHours())}${p(kst.getUTCMinutes())}${p(kst.getUTCSeconds())}`;
  return { date, time };
}

export async function POST(req: NextRequest) {
  try {
    const adminCode = req.headers.get('x-admin-code');
    if (adminCode !== process.env.ADMIN_CODE) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 });
    }

    // 삭제 전 백업
    const [masterRows, assignRows, submitRows] = await Promise.all([
      getSheetData('마스터_학생명단'),
      getSheetData('동아리_배정결과'),
      getSheetData('배정_제출기록'),
    ]);

    const hasData = masterRows.length > 1 || assignRows.length > 1 || submitRows.length > 1;
    if (hasData) {
      const { date, time } = kstTimestamp();
      const backupName = `백업_전체_${date}_${time}`;
      const backupValues: string[][] = [
        ['===마스터_학생명단==='],
        ...masterRows,
        ['===동아리_배정결과==='],
        ...assignRows,
        ['===배정_제출기록==='],
        ...submitRows,
      ];
      await createSheetWithData(backupName, backupValues);
    }

    // 세 시트의 데이터 행을 모두 삭제 (헤더 유지)
    await deleteRowsByCondition('동아리_배정결과', () => true);
    await deleteRowsByCondition('배정_제출기록', () => true);
    await deleteRowsByCondition('마스터_학생명단', () => true);

    return NextResponse.json({ success: true, message: '전체 데이터가 삭제되었습니다.' });
  } catch (err) {
    console.error('[admin/reset-all] Error:', err);
    return NextResponse.json({ error: '전체 삭제 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
