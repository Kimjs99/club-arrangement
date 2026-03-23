import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheets';

export async function GET(req: NextRequest) {
  try {
    const adminCode = req.headers.get('x-admin-code');
    if (adminCode !== process.env.ADMIN_CODE) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 });
    }

    const [masterRows, clubRows, assignmentRows, recordRows] = await Promise.all([
      getSheetData('마스터_학생명단'),
      getSheetData('동아리_목록'),
      getSheetData('동아리_배정결과'),
      getSheetData('배정_제출기록'),
    ]);

    // 마스터: A:학년 B:반 C:번호 D:이름
    const students = masterRows.slice(1).filter((r) => r[0]);
    // 배정결과: A:학년 B:반 C:번호 D:이름 E:동아리명
    const assignments = assignmentRows.slice(1).filter((r) => r[0]);
    // 동아리목록: A:동아리명 B:담당교사
    const clubs = clubRows.slice(1).filter((r) => r[0]);

    // 제출된 학년+반 목록 (A:학년, B:반)
    const submittedClasses = Array.from(
      new Set(assignments.map((r) => `${r[0]}-${r[1]}`))
    ).map((key) => {
      const [grade, classNum] = key.split('-').map(Number);
      return { grade, classNum };
    });

    // 동아리별 배정 인원 (E:동아리명)
    const countMap: Record<string, number> = {};
    for (const row of assignments) {
      const name = row[4];
      if (name) countMap[name] = (countMap[name] ?? 0) + 1;
    }

    // 동아리명 중복 제거 (첫 번째 항목 기준)
    const seenClubs = new Set<string>();
    const clubStats = clubs
      .filter((row) => {
        if (seenClubs.has(row[0])) return false;
        seenClubs.add(row[0]);
        return true;
      })
      .map((row) => ({
        name: row[0],
        teacherName: row[1] ?? '',
        count: countMap[row[0]] ?? 0,
      }));

    // 미제출 학급 (마스터 A:학년, B:반 기준)
    const allClasses = Array.from(
      new Set(students.map((r) => `${r[0]}-${r[1]}`))
    ).map((key) => {
      const [grade, classNum] = key.split('-').map(Number);
      return { grade, classNum };
    });

    const submittedSet = new Set(submittedClasses.map((c) => `${c.grade}-${c.classNum}`));
    const unsubmittedClasses = allClasses.filter((c) => !submittedSet.has(`${c.grade}-${c.classNum}`));

    // 최근 제출 기록
    const recentRecords = recordRows.slice(1).slice(-20).reverse().map((r) => ({
      submittedAt: r[0],
      grade: parseInt(r[1]),
      classNum: parseInt(r[2]),
      teacherName: r[3],
      studentCount: parseInt(r[4]),
      submitCount: parseInt(r[5]),
      type: r[6],
    }));

    return NextResponse.json({
      totalStudents: students.length,
      assignedStudents: assignments.length,
      unassignedStudents: students.length - assignments.length,
      submittedClasses,
      unsubmittedClasses,
      clubStats,
      recentRecords,
    });
  } catch (err) {
    console.error('[admin/stats] Error:', err);
    return NextResponse.json({ error: '통계를 불러오지 못했습니다.' }, { status: 500 });
  }
}
