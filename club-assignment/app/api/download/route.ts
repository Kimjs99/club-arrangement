import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheets';
import { generateAttendanceSheet } from '@/lib/xlsx';
import { AttendanceSheet, Club, Student } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clubName = searchParams.get('clubName');

    if (!clubName) {
      return NextResponse.json({ error: 'clubName 파라미터가 필요합니다.' }, { status: 400 });
    }

    const [clubRows, assignmentRows] = await Promise.all([
      getSheetData('동아리_목록'),
      getSheetData('동아리_배정결과'),
    ]);

    // 동아리 정보 찾기 (A:동아리명, B:담당교사)
    const clubRow = clubRows.slice(1).find((r) => r[0] === clubName);
    if (!clubRow) {
      return NextResponse.json({ error: '해당 동아리를 찾을 수 없습니다.' }, { status: 404 });
    }

    const club: Club = {
      name: clubRow[0],
      teacherName: clubRow[1] ?? '',
    };

    // 해당 동아리 배정 학생 필터링 (A:학년 B:반 C:번호 D:이름 E:동아리명)
    const students: Student[] = assignmentRows
      .slice(1)
      .filter((row) => row[4] === clubName)
      .map((row) => ({
        grade: parseInt(row[0]),
        classNum: parseInt(row[1]),
        number: parseInt(row[2]),
        name: row[3] ?? '',
      }))
      .sort((a, b) => a.grade - b.grade || a.classNum - b.classNum || a.number - b.number);

    const attendanceData: AttendanceSheet = { club, students };
    const buffer = await generateAttendanceSheet(attendanceData);

    const fileName = encodeURIComponent(`${club.name}_출석부.xlsx`);
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${fileName}`,
      },
    });
  } catch (err) {
    console.error('[download] Error:', err);
    return NextResponse.json({ error: '다운로드 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
