export interface Student {
  name: string;      // 이름
  grade: number;     // 학년
  classNum: number;  // 반
  number: number;    // 번호
}

export interface Club {
  name: string;           // 동아리명
  teacherName: string;    // 담당교사명
  currentCount?: number;  // 현재 배정 인원
}

export interface AssignmentRow {
  studentName: string;
  grade: number;
  classNum: number;
  number: number;
  clubName: string;
}

export interface SubmitPayload {
  grade: number;
  classNum: number;
  teacherName: string;
  assignments: AssignmentRow[];
  overwrite?: boolean;
}

export interface AttendanceSheet {
  club: Club;
  students: Student[];
}

export interface SubmitRecord {
  submittedAt: string;
  grade: number;
  classNum: number;
  teacherName: string;
  studentCount: number;
  submitCount: number;
}

export interface AdminStats {
  totalStudents: number;
  assignedStudents: number;
  unassignedStudents: number;
  submittedClasses: { grade: number; classNum: number }[];
  clubStats: { code: string; name: string; count: number }[];
}
