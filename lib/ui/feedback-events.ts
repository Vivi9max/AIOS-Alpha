export const OPEN_FEEDBACK_EVENT =
  "aios:feedback:open";

export function openFeedbackPanel():
  void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      OPEN_FEEDBACK_EVENT
    )
  );
}