import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheets';
import { Student } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const grade = searchParams.get('grade');
    const classNum = searchParams.get('classNum');

    const rows = await getSheetData('마스터_학생명단');
    // A: 학년, B: 반, C: 번호, D: 이름
    const dataRows = rows.slice(1).filter((r) => r[0]);

    let students: Student[] = dataRows.map((row) => ({
      grade: parseInt(row[0]),
      classNum: parseInt(row[1]),
      number: parseInt(row[2]),
      name: row[3] ?? '',
    }));

    if (grade) students = students.filter((s) => s.grade === parseInt(grade));
    if (classNum) students = students.filter((s) => s.classNum === parseInt(classNum));

    students.sort((a, b) => a.number - b.number);

    return NextResponse.json(students);
  } catch (err) {
    console.error('[students] Error:', err);
    return NextResponse.json({ error: '학생 목록을 불러오지 못했습니다.' }, { status: 500 });
  }
}
