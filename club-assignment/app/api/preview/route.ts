import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheets';
import { Student } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clubName = searchParams.get('clubName');

    if (!clubName) {
      return NextResponse.json({ error: 'clubName 필요' }, { status: 400 });
    }

    // A:학년 B:반 C:번호 D:이름 E:동아리명
    const rows = await getSheetData('동아리_배정결과');
    const students: Student[] = rows
      .slice(1)
      .filter((r) => r[4] === clubName)
      .map((r) => ({
        grade: parseInt(r[0]),
        classNum: parseInt(r[1]),
        number: parseInt(r[2]),
        name: r[3] ?? '',
      }))
      .sort((a, b) => a.grade - b.grade || a.classNum - b.classNum || a.number - b.number);

    return NextResponse.json(students);
  } catch (err) {
    console.error('[preview] Error:', err);
    return NextResponse.json({ error: '오류 발생' }, { status: 500 });
  }
}
