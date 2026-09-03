import { useState } from 'react';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import { Check, Circle, Loader2 } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Exercise = {
  id: string;
  order: number;
  title: string;
  passed: boolean;
};

type Result = { status: string; hint?: string | null; message?: string };

/**
 * The checks for one module, and whether the learner's container satisfies them.
 *
 * Every module here is built around 실습 blocks typed into a terminal, and the
 * only feedback until now was comparing the screen to an "예상 출력" line by
 * eye. This asks the container directly. It inspects state rather than replaying
 * commands, so reaching the same result another way still counts — and it never
 * shows the answer, only whether the result is there and a nudge if not.
 */
export function ExerciseChecklist({ moduleId }: { moduleId: string }) {
  const { data, mutate } = useSWR<{ data: { exercises: Exercise[] } }>(
    `/api/learn/modules/${moduleId}/exercises`,
    fetcher
  );
  const [checking, setChecking] = useState<string | null>(null);
  const [hints, setHints] = useState<Record<string, string>>({});

  const exercises = data?.data?.exercises ?? [];
  if (exercises.length === 0) return null;

  const done = exercises.filter((e) => e.passed).length;

  const check = async (exerciseId: string) => {
    setChecking(exerciseId);
    try {
      const res = await fetch(`/api/learn/modules/${moduleId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseId }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error?.message || '확인에 실패했습니다');

      const result: Result = json.data;
      if (result.status === 'passed') {
        setHints((h) => ({ ...h, [exerciseId]: '' }));
        toast.success('확인했습니다');
        mutate();
      } else if (result.status === 'failed') {
        setHints((h) => ({
          ...h,
          [exerciseId]: result.hint || '아직 완료되지 않았습니다.',
        }));
      } else {
        // no_terminal / unavailable — nothing the learner got wrong.
        toast(result.message || '터미널을 먼저 열어주세요.');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setChecking(null);
    }
  };

  return (
    <section className="mt-10 border-t border-[var(--warp-rule)] pt-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          실습 확인
        </h2>
        <span className="warp-num text-xs text-muted-foreground">
          {done}/{exercises.length}
        </span>
      </div>

      <ul className="mt-3">
        {exercises.map((exercise) => (
          <li
            key={exercise.id}
            className="border-b border-[var(--warp-rule)] py-3"
          >
            <div className="flex items-center gap-3">
              {exercise.passed ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-foreground" />
              ) : (
                <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <span
                className={`min-w-0 flex-1 text-sm ${
                  exercise.passed ? 'text-muted-foreground' : 'text-foreground'
                }`}
              >
                {exercise.title}
              </span>
              {!exercise.passed && (
                <button
                  type="button"
                  onClick={() => check(exercise.id)}
                  disabled={checking === exercise.id}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded border border-[var(--warp-rule)] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-white/[0.03] hover:text-foreground disabled:opacity-40"
                >
                  {checking === exercise.id && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  확인
                </button>
              )}
            </div>

            {hints[exercise.id] && (
              <p className="mt-2 pl-6.5 text-xs leading-relaxed text-muted-foreground">
                {hints[exercise.id]}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
