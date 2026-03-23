'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Role = 'submit' | 'download' | 'admin';

interface ModalState {
  role: Role;
  code: string;
  error: string;
}

const ROLE_CONFIG: Record<Role, { label: string; desc: string; path: string; color: string; icon: string }> = {
  submit: {
    label: '담임교사 배정 제출',
    desc: '학급 학생들의 동아리 배정 결과를 입력하고 제출합니다.',
    path: '/submit',
    color: 'bg-blue-600 hover:bg-blue-700',
    icon: '📋',
  },
  download: {
    label: '동아리 담당교사',
    desc: '동아리 출석부 및 명렬표를 XLSX로 다운로드합니다.',
    path: '/download',
    color: 'bg-green-600 hover:bg-green-700',
    icon: '📥',
  },
  admin: {
    label: '관리자 현황판',
    desc: '전체 배정 현황을 확인하고 데이터를 관리합니다.',
    path: '/admin',
    color: 'bg-purple-600 hover:bg-purple-700',
    icon: '📊',
  },
};

export default function Home() {
  const router = useRouter();
  const [modal, setModal] = useState<ModalState | null>(null);
  const [loading, setLoading] = useState(false);

  function openModal(role: Role) {
    setModal({ role, code: '', error: '' });
  }

  async function handleEnter() {
    if (!modal) return;
    setLoading(true);

    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: modal.role, code: modal.code }),
    });

    setLoading(false);
    if (res.ok) {
      sessionStorage.setItem(`auth_${modal.role}`, modal.code);
      router.push(ROLE_CONFIG[modal.role].path);
    } else {
      setModal((m) => m ? { ...m, error: '코드가 올바르지 않습니다.' } : null);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-900 text-4xl mb-4 shadow-lg">
            🏫
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">화접중학교 창체동아리 배정 관리 시스템</h1>
          <p className="text-gray-500">역할을 선택하고 접근 코드를 입력하세요</p>
        </div>

        <div className="grid gap-4">
          {(Object.entries(ROLE_CONFIG) as [Role, typeof ROLE_CONFIG[Role]][]).map(([role, cfg]) => (
            <button
              key={role}
              onClick={() => openModal(role)}
              className={`${cfg.color} text-white rounded-2xl p-6 text-left shadow-md transition-all transform hover:-translate-y-0.5 hover:shadow-lg`}
            >
              <div className="flex items-center gap-4">
                <span className="text-4xl">{cfg.icon}</span>
                <div>
                  <div className="text-xl font-bold">{cfg.label}</div>
                  <div className="text-sm opacity-80 mt-1">{cfg.desc}</div>
                </div>
                <span className="ml-auto text-2xl opacity-60">→</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-1">
              {ROLE_CONFIG[modal.role].icon} {ROLE_CONFIG[modal.role].label}
            </h2>
            <p className="text-gray-500 text-sm mb-6">접근 코드를 입력하세요</p>

            <input
              type="password"
              value={modal.code}
              onChange={(e) => setModal((m) => m ? { ...m, code: e.target.value, error: '' } : null)}
              onKeyDown={(e) => e.key === 'Enter' && handleEnter()}
              placeholder="접근 코드"
              autoFocus
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-blue-500 mb-2"
            />
            {modal.error && <p className="text-red-500 text-sm mb-3">{modal.error}</p>}

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-medium hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleEnter}
                disabled={loading || !modal.code}
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '확인 중...' : '입장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
