import type { Exercise } from "@/lib/types";
import type { PracticeContent, PracticeSave } from "@/contracts/practice";

export function snapshotExercise(exercise: Exercise, language: PracticeSave["language"]): PracticeContent {
  const variant = language === "design" ? undefined : exercise.languages?.[language];
  return {
    title: exercise.title, description: exercise.description, kind: exercise.kind, duration: exercise.duration,
    requirements: exercise.requirements, rubric: exercise.rubric, hints: exercise.hints, phases: exercise.phases,
    starter: language === "design" ? "" : variant?.starter ?? exercise.starter ?? "",
    referenceSolution: language === "design" ? "" : variant?.solution ?? exercise.solution ?? "",
  };
}
