import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheets';

export async function GET(req: NextRequest) {
  try {
    const adminCode = req.headers.get('x-admin-code');
    if (adminCode !== process.env.ADMIN_CODE) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const grade = Number(searchParams.get('grade'));
    const classNum = Number(searchParams.get('classNum'));

    if (!grade || !classNum) {
      return NextResponse.json({ error: 'grade, classNum 필요' }, { status: 400 });
    }

    const [masterRows, assignmentRows] = await Promise.all([
      getSheetData('마스터_학생명단'),
      getSheetData('동아리_배정결과'),
    ]);

    // 마스터: A:학년 B:반 C:번호 D:이름
    const students = masterRows
      .slice(1)
      .filter((r) => Number(r[0]) === grade && Number(r[1]) === classNum)
      .map((r) => ({ grade, classNum, number: Number(r[2]), name: r[3] ?? '' }));

    // 배정결과: A:학년 B:반 C:번호 D:이름 E:동아리명
    const assignmentMap = new Map<string, string>();
    assignmentRows
      .slice(1)
      .filter((r) => Number(r[0]) === grade && Number(r[1]) === classNum)
      .forEach((r) => assignmentMap.set(`${r[0]}-${r[1]}-${r[2]}`, r[4] ?? ''));

    const result = students.map((s) => ({
      ...s,
      clubName: assignmentMap.get(`${s.grade}-${s.classNum}-${s.number}`) ?? '',
    }));

    return NextResponse.json({ students: result });
  } catch (err) {
    console.error('[admin/class] Error:', err);
    return NextResponse.json({ error: '오류 발생' }, { status: 500 });
  }
}
