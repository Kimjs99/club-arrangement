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

    const body = await req.json();
    const { grade, classNum } = body;

    if (!grade || !classNum) {
      return NextResponse.json({ error: '학년과 반을 지정해주세요.' }, { status: 400 });
    }

    // 삭제 전 해당 학급 데이터 백업
    const assignRows = await getSheetData('동아리_배정결과');
    const header = assignRows[0] ?? [];
    const classData = assignRows.slice(1).filter(
      (r) => Number(r[0]) === grade && Number(r[1]) === classNum
    );

    if (classData.length > 0) {
      const { date, time } = kstTimestamp();
      const backupName = `백업_${grade}학년${classNum}반_${date}_${time}`;
      const backupValues: string[][] = [
        ['===동아리_배정결과==='],
        header,
        ...classData,
      ];
      await createSheetWithData(backupName, backupValues);
    }

    await deleteRowsByCondition(
      '동아리_배정결과',
      (row) => Number(row[0]) === grade && Number(row[1]) === classNum
    );

    return NextResponse.json({ success: true, message: `${grade}학년 ${classNum}반 데이터가 초기화되었습니다.` });
  } catch (err) {
    console.error('[admin/reset] Error:', err);
    return NextResponse.json({ error: '초기화 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
