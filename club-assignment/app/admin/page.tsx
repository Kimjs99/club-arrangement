'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface ClubStat { name: string; teacherName: string; count: number; }
interface ClassInfo { grade: number; classNum: number; }
interface RecentRecord { submittedAt: string; grade: number; classNum: number; teacherName: string; studentCount: number; submitCount: number; type: string; }
interface Stats { totalStudents: number; assignedStudents: number; unassignedStudents: number; submittedClasses: ClassInfo[]; unsubmittedClasses: ClassInfo[]; clubStats: ClubStat[]; recentRecords: RecentRecord[]; }
interface StudentWithClub { grade: number; classNum: number; number: number; name: string; clubName: string; }
interface Club { name: string; teacherName: string; }

type Tab = 'stats' | 'manage' | 'clubs';

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminCode, setAdminCode] = useState('');
  const [clubs, setClubs] = useState<Club[]>([]);

  // ── 현황판 상태 ────────────────────────────────────────────────
  const [resetTarget, setResetTarget] = useState<ClassInfo | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetAllOpen, setResetAllOpen] = useState(false);
  const [resetAllConfirmText, setResetAllConfirmText] = useState('');
  const [resettingAll, setResettingAll] = useState(false);
  const RESET_ALL_PHRASE = '전체삭제확인';

  // ── 학생/배정 관리 상태 ────────────────────────────────────────
  const [manageGrade, setManageGrade] = useState<number | null>(null);
  const [manageClass, setManageClass] = useState<number | null>(null);
  const [classStudents, setClassStudents] = useState<StudentWithClub[]>([]);
  const [loadingClass, setLoadingClass] = useState(false);

  // 학생 추가 모달
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState({ number: '', name: '' });
  const [addStudentConfirm, setAddStudentConfirm] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);

  // 배정 변경 모달
  const [editTarget, setEditTarget] = useState<StudentWithClub | null>(null);
  const [newClub, setNewClub] = useState('');
  const [editConfirm, setEditConfirm] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);

  // ── 동아리 명단 상태 ───────────────────────────────────────────
  const [selectedClub, setSelectedClub] = useState('');
  const [clubMembers, setClubMembers] = useState<StudentWithClub[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const fetchStats = useCallback(async (code: string) => {
    setLoading(true);
    const res = await fetch('/api/admin/stats', { headers: { 'x-admin-code': code } });
    if (res.ok) setStats(await res.json());
    else router.push('/');
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const code = sessionStorage.getItem('auth_admin');
    if (!code) { router.push('/'); return; }
    setAdminCode(code);
    fetchStats(code);
    fetch('/api/clubs').then((r) => r.json()).then(setClubs);
  }, [fetchStats, router]);

  // 학급 학생 로드
  const refreshClassStudents = useCallback(async (code: string, grade: number, classNum: number) => {
    setLoadingClass(true);
    const res = await fetch(`/api/admin/class?grade=${grade}&classNum=${classNum}`, { headers: { 'x-admin-code': code } });
    const data = await res.json();
    setClassStudents(data.students || []);
    setLoadingClass(false);
  }, []);

  useEffect(() => {
    if (!manageGrade || !manageClass || !adminCode) return;
    refreshClassStudents(adminCode, manageGrade, manageClass);
  }, [manageGrade, manageClass, adminCode, refreshClassStudents]);

  // 동아리 명단 로드
  useEffect(() => {
    if (!selectedClub) return;
    setLoadingMembers(true);
    fetch(`/api/preview?clubName=${encodeURIComponent(selectedClub)}`)
      .then((r) => r.json())
      .then((d) => { setClubMembers(d || []); setLoadingMembers(false); });
  }, [selectedClub]);

  // ── 현황판 기능 ────────────────────────────────────────────────
  async function doResetAll() {
    if (!adminCode || resetAllConfirmText !== RESET_ALL_PHRASE) return;
    setResettingAll(true);
    const res = await fetch('/api/admin/reset-all', { method: 'POST', headers: { 'x-admin-code': adminCode } });
    setResettingAll(false);
    if (res.ok) {
      alert('전체 데이터가 삭제되었습니다.');
      setResetAllOpen(false); setResetAllConfirmText('');
      fetchStats(adminCode);
    } else alert('전체 삭제 실패');
  }

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
      setResetTarget(null); fetchStats(adminCode);
    } else alert('초기화 실패');
  }

  // ── 학생 추가 ──────────────────────────────────────────────────
  async function doAddStudent() {
    if (!manageGrade || !manageClass || !newStudentForm.number || !newStudentForm.name || !adminCode) return;
    setAddingStudent(true);
    const res = await fetch('/api/admin/student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-code': adminCode },
      body: JSON.stringify({ grade: manageGrade, classNum: manageClass, number: Number(newStudentForm.number), name: newStudentForm.name }),
    });
    setAddingStudent(false);
    const data = await res.json();
    if (res.ok) {
      setAddStudentOpen(false); setAddStudentConfirm(false);
      setNewStudentForm({ number: '', name: '' });
      refreshClassStudents(adminCode, manageGrade, manageClass);
    } else alert(`오류: ${data.error}`);
  }

  // ── 배정 변경 ──────────────────────────────────────────────────
  async function doEditAssignment() {
    if (!editTarget || !adminCode) return;
    setSavingAssignment(true);
    const res = await fetch('/api/admin/assignment', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-code': adminCode },
      body: JSON.stringify({ grade: editTarget.grade, classNum: editTarget.classNum, number: editTarget.number, name: editTarget.name, clubName: newClub }),
    });
    setSavingAssignment(false);
    if (res.ok) {
      setEditTarget(null); setEditConfirm(false); setNewClub('');
      if (manageGrade && manageClass) refreshClassStudents(adminCode, manageGrade, manageClass);
    } else alert('배정 변경 실패');
  }

  // ── 출석부 다운로드 ────────────────────────────────────────────
  async function downloadClubXlsx() {
    if (!selectedClub) return;
    const res = await fetch(`/api/download?clubName=${encodeURIComponent(selectedClub)}`);
    if (!res.ok) { alert('다운로드 실패'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${selectedClub}_출석부.xlsx`; a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400 text-lg">데이터 불러오는 중...</div>;
  if (!stats) return null;

  const assignmentRate = stats.totalStudents > 0
    ? Math.round((stats.assignedStudents / stats.totalStudents) * 100) : 0;

  return (
    <div className="min-h-screen p-4 max-w-6xl mx-auto">

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/')} className="text-gray-500 hover:text-gray-700 text-2xl">←</button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">📊 관리자 현황판</h1>
            <p className="text-gray-500 text-sm">전체 동아리 배정 현황 및 데이터 관리</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fetchStats(adminCode)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium">
            새로고침
          </button>
          <button onClick={() => { setResetAllOpen(true); setResetAllConfirmText(''); }}
            className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 text-sm font-medium">
            전체 데이터 삭제
          </button>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {([['stats', '📊 현황판'], ['manage', '👤 학생/배정 관리'], ['clubs', '📋 동아리 명단']] as [Tab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* 현황판 탭                                                  */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'stats' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: '전체 학생', value: stats.totalStudents, color: 'bg-blue-500', unit: '명' },
              { label: '배정 완료', value: stats.assignedStudents, color: 'bg-green-500', unit: '명' },
              { label: '미배정', value: stats.unassignedStudents, color: 'bg-red-500', unit: '명' },
              { label: '배정률', value: assignmentRate, color: 'bg-purple-500', unit: '%' },
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-2xl shadow-sm p-5">
                <div className={`${card.color} text-white text-xs font-bold px-2 py-0.5 rounded-full inline-block mb-3`}>{card.label}</div>
                <div className="text-3xl font-bold text-gray-800">{card.value}<span className="text-lg text-gray-400 font-normal">{card.unit}</span></div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>전체 배정 진행률</span>
              <span>{stats.assignedStudents} / {stats.totalStudents}명 ({assignmentRate}%)</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-4">
              <div className="bg-gradient-to-r from-blue-500 to-green-500 h-4 rounded-full transition-all" style={{ width: `${assignmentRate}%` }} />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-bold text-gray-700 mb-4">미제출 학급
                <span className="ml-2 text-sm font-normal text-red-500">{stats.unsubmittedClasses.length}개</span>
              </h2>
              {stats.unsubmittedClasses.length === 0 ? (
                <p className="text-green-500 text-center py-4 font-medium">모든 학급이 제출 완료!</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {stats.unsubmittedClasses.sort((a, b) => a.grade - b.grade || a.classNum - b.classNum).map((c) => (
                    <span key={`${c.grade}-${c.classNum}`}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                      {c.grade}-{c.classNum}반
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-bold text-gray-700 mb-4">제출 완료 학급
                <span className="ml-2 text-sm font-normal text-green-500">{stats.submittedClasses.length}개</span>
              </h2>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {stats.submittedClasses.sort((a, b) => a.grade - b.grade || a.classNum - b.classNum).map((c) => (
                  <div key={`${c.grade}-${c.classNum}`} className="flex items-center gap-1 group">
                    <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">{c.grade}-{c.classNum}반</span>
                    <button onClick={() => setResetTarget(c)}
                      className="hidden group-hover:inline text-red-400 hover:text-red-600 text-xs" title="초기화">✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
            <h2 className="font-bold text-gray-700 mb-4">동아리별 배정 현황</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-gray-600">동아리명</th>
                    <th className="px-4 py-2 text-left text-gray-600">담당교사</th>
                    <th className="px-4 py-2 text-center text-gray-600">배정 인원</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.clubStats.sort((a, b) => b.count - a.count).map((c, idx) => (
                    <tr key={c.name} className={`border-t ${idx % 2 === 0 ? '' : 'bg-gray-50'}`}>
                      <td className="px-4 py-2 font-medium text-gray-800">{c.name}</td>
                      <td className="px-4 py-2 text-gray-500">{c.teacherName}</td>
                      <td className="px-4 py-2 text-center font-bold text-blue-600">{c.count}명</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-bold text-gray-700 mb-4">최근 제출 기록</h2>
            <div className="space-y-2">
              {stats.recentRecords.slice(0, 10).map((r, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium mr-2 ${r.type === '재제출' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{r.type}</span>
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
        </>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* 학생/배정 관리 탭                                          */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'manage' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-bold text-gray-700 mb-4">학급 선택</h2>
            <div className="flex flex-wrap gap-6">
              <div>
                <label className="block text-sm text-gray-500 mb-2">학년</label>
                <div className="flex gap-2">
                  {[1, 2, 3].map((g) => (
                    <button key={g} onClick={() => { setManageGrade(g); setManageClass(null); setClassStudents([]); }}
                      className={`w-12 h-12 rounded-xl font-bold text-lg border-2 transition-all ${manageGrade === g ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-400'}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-2">반</label>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((c) => (
                    <button key={c} onClick={() => setManageClass(c)}
                      className={`w-10 h-10 rounded-xl font-bold border-2 transition-all ${manageClass === c ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-400'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {manageGrade && manageClass && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-700">
                  {manageGrade}학년 {manageClass}반 학생 목록
                  <span className="ml-2 text-sm font-normal text-gray-500">{classStudents.length}명</span>
                </h2>
                <button
                  onClick={() => { setAddStudentOpen(true); setAddStudentConfirm(false); setNewStudentForm({ number: '', name: '' }); }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                  + 학생 추가
                </button>
              </div>

              {loadingClass ? (
                <div className="text-center py-8 text-gray-400">불러오는 중...</div>
              ) : classStudents.length === 0 ? (
                <div className="text-center py-8 text-gray-400">등록된 학생이 없습니다.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-center text-gray-600 w-16">번호</th>
                        <th className="px-3 py-2 text-left text-gray-600">이름</th>
                        <th className="px-3 py-2 text-left text-gray-600">현재 동아리</th>
                        <th className="px-3 py-2 text-center text-gray-600 w-24">수정</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...classStudents].sort((a, b) => a.number - b.number).map((s, idx) => (
                        <tr key={`${s.grade}-${s.classNum}-${s.number}`}
                          className={`border-t ${idx % 2 === 0 ? '' : 'bg-gray-50'}`}>
                          <td className="px-3 py-2 text-center text-gray-500">{s.number}</td>
                          <td className="px-3 py-2 font-medium text-gray-800">{s.name}</td>
                          <td className="px-3 py-2">
                            {s.clubName
                              ? <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium">{s.clubName}</span>
                              : <span className="text-gray-300 text-xs">미배정</span>}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => { setEditTarget(s); setNewClub(s.clubName); setEditConfirm(false); }}
                              className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 border border-blue-200">
                              배정 변경
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* 동아리 명단 탭                                             */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'clubs' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-bold text-gray-700 mb-4">동아리 선택</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {clubs.map((c) => (
                <button key={c.name} onClick={() => setSelectedClub(c.name)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all text-left ${selectedClub === c.name ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                  <div>{c.name}</div>
                  <div className="text-xs font-normal opacity-60">{c.teacherName}</div>
                </button>
              ))}
            </div>
          </div>

          {selectedClub && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-700">
                  {selectedClub}
                  <span className="ml-2 text-sm font-normal text-gray-500">{clubMembers.length}명</span>
                </h2>
                <button onClick={downloadClubXlsx}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700">
                  ⬇ 출석부 다운로드
                </button>
              </div>

              {loadingMembers ? (
                <div className="text-center py-8 text-gray-400">불러오는 중...</div>
              ) : clubMembers.length === 0 ? (
                <div className="text-center py-8 text-gray-400">배정된 학생이 없습니다.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-center text-gray-600">학년</th>
                        <th className="px-3 py-2 text-center text-gray-600">반</th>
                        <th className="px-3 py-2 text-center text-gray-600">번호</th>
                        <th className="px-3 py-2 text-left text-gray-600">이름</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...clubMembers]
                        .sort((a, b) => a.grade - b.grade || a.classNum - b.classNum || a.number - b.number)
                        .map((m, idx) => (
                          <tr key={`${m.grade}-${m.classNum}-${m.number}`}
                            className={`border-t ${idx % 2 === 0 ? '' : 'bg-gray-50'}`}>
                            <td className="px-3 py-2 text-center">{m.grade}</td>
                            <td className="px-3 py-2 text-center">{m.classNum}</td>
                            <td className="px-3 py-2 text-center">{m.number}</td>
                            <td className="px-3 py-2 font-medium text-gray-800">{m.name}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* 모달: 학생 추가 1단계 — 입력                               */}
      {/* ══════════════════════════════════════════════════════════ */}
      {addStudentOpen && !addStudentConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold mb-1">학생 추가</h3>
            <p className="text-sm text-gray-500 mb-5">{manageGrade}학년 {manageClass}반에 학생을 추가합니다.</p>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 block mb-1">번호</label>
                <input type="number" value={newStudentForm.number}
                  onChange={(e) => setNewStudentForm((f) => ({ ...f, number: e.target.value }))}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500"
                  placeholder="예) 15" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">이름</label>
                <input type="text" value={newStudentForm.name}
                  onChange={(e) => setNewStudentForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500"
                  placeholder="예) 홍길동" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setAddStudentOpen(false)} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600">취소</button>
              <button onClick={() => setAddStudentConfirm(true)}
                disabled={!newStudentForm.number || !newStudentForm.name}
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-40">
                다음
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 모달: 학생 추가 2단계 — 확인 */}
      {addStudentOpen && addStudentConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold mb-4">추가 확인</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 text-sm">
              <p className="text-blue-800">
                <span className="font-bold">{manageGrade}학년 {manageClass}반 {newStudentForm.number}번 {newStudentForm.name}</span> 학생을
                마스터 학생명단에 추가합니다.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAddStudentConfirm(false)} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600">이전</button>
              <button onClick={doAddStudent} disabled={addingStudent}
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold">
                {addingStudent ? '추가 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* 모달: 배정 변경 1단계 — 동아리 선택                        */}
      {/* ══════════════════════════════════════════════════════════ */}
      {editTarget && !editConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold mb-1">동아리 배정 변경</h3>
            <p className="text-sm text-gray-500 mb-4">
              <span className="font-medium text-gray-800">{editTarget.name}</span>
              ({manageGrade}학년 {manageClass}반 {editTarget.number}번)
            </p>
            <div className="mb-5">
              <div className="flex items-center gap-2 text-sm mb-3">
                <span className="text-gray-500">현재:</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg">{editTarget.clubName || '미배정'}</span>
              </div>
              <label className="text-sm text-gray-600 block mb-1">변경할 동아리</label>
              <select value={newClub} onChange={(e) => setNewClub(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500">
                <option value="">-- 선택 --</option>
                {clubs.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditTarget(null)} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600">취소</button>
              <button onClick={() => setEditConfirm(true)}
                disabled={!newClub || newClub === editTarget.clubName}
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-40">
                다음
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 모달: 배정 변경 2단계 — 확인 */}
      {editTarget && editConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold mb-4">변경 확인</h3>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm">
              <p className="font-bold text-amber-800 mb-2">{editTarget.name} 학생의 동아리를 변경합니다.</p>
              <div className="flex items-center gap-2 text-amber-700">
                <span className="px-2 py-1 bg-white rounded-lg border border-amber-200">{editTarget.clubName || '미배정'}</span>
                <span className="font-bold">→</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg font-medium">{newClub}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditConfirm(false)} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600">이전</button>
              <button onClick={doEditAssignment} disabled={savingAssignment}
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold">
                {savingAssignment ? '저장 중...' : '변경 확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* 모달: 학급 초기화 확인                                     */}
      {/* ══════════════════════════════════════════════════════════ */}
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

      {/* ══════════════════════════════════════════════════════════ */}
      {/* 모달: 전체 데이터 삭제 확인                                */}
      {/* ══════════════════════════════════════════════════════════ */}
      {resetAllOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">⚠️</span>
              <h3 className="text-xl font-bold text-red-600">전체 데이터 삭제</h3>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 text-sm text-red-700 space-y-1">
              <p className="font-bold">다음 데이터가 모두 삭제됩니다:</p>
              <ul className="list-disc list-inside space-y-0.5 mt-1">
                <li>마스터_학생명단 (전체 학생)</li>
                <li>동아리_배정결과 (전체 배정 데이터)</li>
                <li>배정_제출기록 (전체 제출 이력)</li>
              </ul>
              <p className="mt-2 font-bold">이 작업은 되돌릴 수 없습니다.</p>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              계속하려면 아래에 <strong className="text-red-600">{RESET_ALL_PHRASE}</strong> 를 정확히 입력하세요.
            </p>
            <input type="text" value={resetAllConfirmText}
              onChange={(e) => setResetAllConfirmText(e.target.value)}
              placeholder={RESET_ALL_PHRASE}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-red-400 mb-5 text-center tracking-widest font-mono" />
            <div className="flex gap-3">
              <button onClick={() => { setResetAllOpen(false); setResetAllConfirmText(''); }}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-medium">취소</button>
              <button onClick={doResetAll}
                disabled={resettingAll || resetAllConfirmText !== RESET_ALL_PHRASE}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-700">
                {resettingAll ? '삭제 중...' : '전체 삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
