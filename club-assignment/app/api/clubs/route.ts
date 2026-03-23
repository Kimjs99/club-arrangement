import { NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheets';
import { Club } from '@/types';

export async function GET() {
  try {
    const [clubRows, assignmentRows] = await Promise.all([
      getSheetData('동아리_목록'),
      getSheetData('동아리_배정결과'),
    ]);

    const clubData = clubRows.slice(1);
    const assignmentData = assignmentRows.slice(1);

    // 동아리별 현재 배정 인원 카운트 (E열: 동아리명)
    const countMap: Record<string, number> = {};
    for (const row of assignmentData) {
      const name = row[4];
      if (name) countMap[name] = (countMap[name] ?? 0) + 1;
    }

    const clubs: Club[] = clubData
      .filter((row) => row[0])
      .map((row) => ({
        name: row[0],
        teacherName: row[1] ?? '',
        currentCount: countMap[row[0]] ?? 0,
      }));

    return NextResponse.json(clubs);
  } catch (err) {
    console.error('[clubs] Error:', err);
    return NextResponse.json({ error: '동아리 목록을 불러오지 못했습니다.' }, { status: 500 });
  }
}
