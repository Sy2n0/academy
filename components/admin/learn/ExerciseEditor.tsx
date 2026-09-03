import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import {
  adminButtonClass,
  adminButtonPrimaryClass,
  adminInputClass,
  adminLabelClass,
} from '@/components/admin/styles';

type Exercise = {
  id?: string;
  order: number;
  title: string;
  checkCommand: string;
  hint: string;
};

/**
 * Authoring for a module's exercise checks.
 *
 * The check is a shell command run inside the learner's own terminal container;
 * exit 0 means done. It should look at what the shell left behind — a file, a
 * permission, a directory — rather than at what was typed, so a learner who got
 * there another way still passes.
 */
export function ExerciseEditor({ moduleId }: { moduleId: string }) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/learn/modules/${moduleId}/exercises`)
      .then((r) => r.json())
      .then((json) => {
        setExercises(
          (json.data?.exercises ?? []).map((e: any) => ({
            id: e.id,
            order: e.order,
            title: e.title,
            checkCommand: e.checkCommand,
            hint: e.hint ?? '',
          }))
        );
      })
      .catch(() => toast.error('실습 목록을 불러오지 못했습니다'))
      .finally(() => setLoading(false));
  }, [moduleId]);

  const update = (index: number, patch: Partial<Exercise>) =>
    setExercises((prev) =>
      prev.map((e, i) => (i === index ? { ...e, ...patch } : e))
    );

  const add = () =>
    setExercises((prev) => [
      ...prev,
      {
        order: prev.length ? Math.max(...prev.map((e) => e.order)) + 1 : 1,
        title: '',
        checkCommand: '',
        hint: '',
      },
    ]);

  const remove = (index: number) =>
    setExercises((prev) => prev.filter((_, i) => i !== index));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/learn/modules/${moduleId}/exercises`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // Renumbered on save so deleting the middle one does not leave a gap
            // the unique constraint then trips over.
            exercises: exercises.map((e, i) => ({ ...e, order: i + 1 })),
          }),
        }
      );
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error?.message || '저장에 실패했습니다');
      setExercises(
        json.data.exercises.map((e: any) => ({ ...e, hint: e.hint ?? '' }))
      );
      toast.success('저장했습니다');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="py-6 text-sm text-muted-foreground">불러오는 중...</p>;
  }

  return (
    <div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        학생의 터미널 컨테이너에서 실행되는 확인 명령입니다. 종료 코드 0이면
        완료로 처리됩니다. 입력한 명령을 비교하는 게 아니라{' '}
        <span className="text-foreground">결과가 남았는지</span>를 확인하도록
        작성하세요 — 예:{' '}
        <code className="warp-num">test -d ~/grep_practice</code>
      </p>

      {exercises.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">
          등록된 실습 확인이 없습니다.
        </p>
      ) : (
        <ul className="mt-4 border-t border-[var(--warp-rule)]">
          {exercises.map((exercise, index) => (
            <li
              key={exercise.id ?? `new-${index}`}
              className="border-b border-[var(--warp-rule)] py-4"
            >
              <div className="flex items-start gap-3">
                <span className="warp-num mt-2 w-5 shrink-0 text-sm text-muted-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <label className={adminLabelClass}>제목</label>
                    <input
                      value={exercise.title}
                      onChange={(e) => update(index, { title: e.target.value })}
                      placeholder="연습 폴더와 fruits.txt 만들기"
                      className={adminInputClass}
                    />
                  </div>
                  <div>
                    <label className={adminLabelClass}>확인 명령</label>
                    <textarea
                      value={exercise.checkCommand}
                      onChange={(e) =>
                        update(index, { checkCommand: e.target.value })
                      }
                      rows={2}
                      placeholder="test -d ~/grep_practice && test -s ~/grep_practice/fruits.txt"
                      className={`${adminInputClass} warp-num resize-y`}
                    />
                  </div>
                  <div>
                    <label className={adminLabelClass}>
                      힌트 — 실패했을 때만 보입니다
                    </label>
                    <input
                      value={exercise.hint}
                      onChange={(e) => update(index, { hint: e.target.value })}
                      placeholder="정답이 아니라 방향만 알려주세요"
                      className={adminInputClass}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="mt-1 rounded p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.03] hover:text-destructive"
                  title="삭제"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex justify-between gap-2">
        <button type="button" onClick={add} className={adminButtonClass}>
          <Plus className="h-3 w-3" />
          실습 추가
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className={adminButtonPrimaryClass}
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  );
}
