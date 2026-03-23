'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface ClubStat {
  code: string;
  name: string;
  teacherName: string;
  maxCapacity?: number;
  count: number;
}

interface ClassInfo {
  grade: number;
  classNum: number;
}

interface RecentRecord {
  submittedAt: string;
  grade: number;
  classNum: number;
  teacherName: string;
  studentCount: number;
  submitCount: number;
  type: string;
}

interface Stats {
  totalStudents: number;
  assignedStudents: number;
  unassignedStudents: number;
  submittedClasses: ClassInfo[];
  unsubmittedClasses: ClassInfo[];
  clubStats: ClubStat[];
  recentRecords: RecentRecord[];
}

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetTarget, setResetTarget] = useState<ClassInfo | null>(null);
  const [resetting, setResetting] = useState(false);
  const [adminCode, setAdminCode] = useState('');

  const fetchStats = useCallback(async (code: string) => {
    setLoading(true);
    const res = await fetch('/api/admin/stats', {
      headers: { 'x-admin-code': code },
    });
    if (res.ok) {
      setStats(await res.json());
    } else {
      router.push('/');
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const code = sessionStorage.getItem('auth_admin');
    if (!code) { router.push('/'); return; }
    setAdminCode(code);
    fetchStats(code);
  }, [fetchStats, router]);

  async function doReset() {
    if (!resetTarget || !adminCode) return;
    setResetting(true);
    const res = await fetch('/api/admin/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-code': adminCode },
      body: JSON.stringify(resetTarget),
    });
    setResetting(false);
    if (res.ok) {
      alert(`${resetTarget.grade}학년 ${resetTarget.classNum}반 데이터가 초기화되었습니다.`);
      setResetTarget(null);
      fetchStats(adminCode);
    } else {
      alert('초기화 실패');
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400 text-lg">데이터 불러오는 중...</div>;
  }

  if (!stats) return null;

  const assignmentRate = stats.totalStudents > 0
    ? Math.round((stats.assignedStudents / stats.totalStudents) * 100)
    : 0;

  return (
    <div className="min-h-screen p-4 max-w-6xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/')} className="text-gray-500 hover:text-gray-700 text-2xl">←</button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">📊 관리자 현황판</h1>
            <p className="text-gray-500 text-sm">전체 동아리 배정 현황</p>
          </div>
        </div>
        <button onClick={() => fetchStats(adminCode)}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium">
          새로고침
        </button>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: '전체 학생', value: stats.totalStudents, color: 'bg-blue-500', unit: '명' },
          { label: '배정 완료', value: stats.assignedStudents, color: 'bg-green-500', unit: '명' },
          { label: '미배정', value: stats.unassignedStudents, color: 'bg-red-500', unit: '명' },
          { label: '배정률', value: assignmentRate, color: 'bg-purple-500', unit: '%' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl shadow-sm p-5">
            <div className={`${card.color} text-white text-xs font-bold px-2 py-0.5 rounded-full inline-block mb-3`}>
              {card.label}
            </div>
            <div className="text-3xl font-bold text-gray-800">
              {card.value}<span className="text-lg text-gray-400 font-normal">{card.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 배정률 진행 바 */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>전체 배정 진행률</span>
          <span>{stats.assignedStudents} / {stats.totalStudents}명 ({assignmentRate}%)</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-4">
          <div
            className="bg-gradient-to-r from-blue-500 to-green-500 h-4 rounded-full transition-all"
            style={{ width: `${assignmentRate}%` }}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {/* 미제출 학급 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-bold text-gray-700 mb-4">
            미제출 학급
            <span className="ml-2 text-sm font-normal text-red-500">{stats.unsubmittedClasses.length}개</span>
          </h2>
          {stats.unsubmittedClasses.length === 0 ? (
            <p className="text-green-500 text-center py-4 font-medium">모든 학급이 제출 완료!</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {stats.unsubmittedClasses
                .sort((a, b) => a.grade - b.grade || a.classNum - b.classNum)
                .map((c) => (
                  <div key={`${c.grade}-${c.classNum}`} className="flex items-center gap-1">
                    <span className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                      {c.grade}-{c.classNum}반
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* 제출 완료 학급 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-bold text-gray-700 mb-4">
            제출 완료 학급
            <span className="ml-2 text-sm font-normal text-green-500">{stats.submittedClasses.length}개</span>
          </h2>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            {stats.submittedClasses
              .sort((a, b) => a.grade - b.grade || a.classNum - b.classNum)
              .map((c) => (
                <div key={`${c.grade}-${c.classNum}`} className="flex items-center gap-1 group">
                  <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    {c.grade}-{c.classNum}반
                  </span>
                  <button
                    onClick={() => setResetTarget(c)}
                    className="hidden group-hover:inline text-red-400 hover:text-red-600 text-xs"
                    title="초기화"
                  >
                    ✕
                  </button>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* 동아리별 배정 현황 */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
        <h2 className="font-bold text-gray-700 mb-4">동아리별 배정 현황</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left text-gray-600">동아리명</th>
                <th className="px-4 py-2 text-left text-gray-600">담당교사</th>
                <th className="px-4 py-2 text-center text-gray-600">배정 인원</th>
                <th className="px-4 py-2 text-center text-gray-600">정원</th>
                <th className="px-4 py-2 text-left text-gray-600">배정률</th>
              </tr>
            </thead>
            <tbody>
              {stats.clubStats
                .sort((a, b) => b.count - a.count)
                .map((c, idx) => {
                  const rate = c.maxCapacity ? Math.min(100, Math.round((c.count / c.maxCapacity) * 100)) : null;
                  return (
                    <tr key={c.name} className={`border-t ${idx % 2 === 0 ? '' : 'bg-gray-50'}`}>
                      <td className="px-4 py-2 font-medium text-gray-800">{c.name}</td>
                      <td className="px-4 py-2 text-gray-500">{c.teacherName}</td>
                      <td className="px-4 py-2 text-center font-bold text-blue-600">{c.count}명</td>
                      <td className="px-4 py-2 text-center text-gray-400">{c.maxCapacity ?? '-'}</td>
                      <td className="px-4 py-2">
                        {rate !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${rate >= 100 ? 'bg-red-500' : rate >= 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-8">{rate}%</span>
                          </div>
                        ) : <span className="text-gray-300">-</span>}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 최근 제출 기록 */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="font-bold text-gray-700 mb-4">최근 제출 기록</h2>
        <div className="space-y-2">
          {stats.recentRecords.slice(0, 10).map((r, idx) => (
            <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium mr-2 ${r.type === '재제출' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                  {r.type}
                </span>
                <span className="font-medium text-gray-800">{r.grade}학년 {r.classNum}반</span>
                <span className="text-gray-500 ml-2">({r.teacherName} 교사)</span>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">{r.studentCount}명</div>
                <div className="text-xs text-gray-400">{r.submittedAt}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 초기화 확인 모달 */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold mb-2 text-red-600">데이터 초기화</h3>
            <p className="text-gray-600 mb-4">
              {resetTarget.grade}학년 {resetTarget.classNum}반의 모든 배정 데이터를 삭제합니다. 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setResetTarget(null)} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600">취소</button>
              <button onClick={doReset} disabled={resetting} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold">
                {resetting ? '처리 중...' : '초기화'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
