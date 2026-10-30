import { flashcards } from "@/data/prep";
import type { WorkspaceState } from "./types";

export function latestReviews(reviews: WorkspaceState["reviews"]) {
  const latest = new Map<string, WorkspaceState["reviews"][number]>();
  for (const review of reviews) if (!latest.has(review.cardId) || review.reviewedAt > latest.get(review.cardId)!.reviewedAt) latest.set(review.cardId, review);
  return latest;
}

export function reviewCounts(reviews: WorkspaceState["reviews"], now = Date.now()) {
  const latest = latestReviews(reviews);
  return {
    due: flashcards.filter(card => { const review = latest.get(card.id); return review && Date.parse(review.dueAt) <= now; }).length,
    fresh: flashcards.filter(card => !latest.has(card.id)).length,
    total: flashcards.length,
  };
}
