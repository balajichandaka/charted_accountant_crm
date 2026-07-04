import type { KeyboardEvent } from "react";

/**
 * Stop Enter in a single-line <input> from implicitly submitting the form.
 * Attach to a <form onKeyDown={blockEnterSubmit}>. Textareas keep their newline
 * behaviour, and pressing Enter while focused on the submit button still works —
 * so the form only submits via an explicit button click/activation.
 */
export function blockEnterSubmit(e: KeyboardEvent<HTMLFormElement>) {
  const target = e.target as HTMLElement;
  if (e.key === "Enter" && target instanceof HTMLInputElement) {
    e.preventDefault();
  }
}
