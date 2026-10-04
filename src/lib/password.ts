/** A tablet-friendly rule: long enough, with a letter and a number. */
export function passwordProblem(password: string, email: string): string | null {
  if (password.length < 10 || password.length > 200 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Use at least 10 characters, with a letter and a number.";
  }
  if (password.toLowerCase() === email.trim().toLowerCase()) {
    return "Choose a password that is not your email address.";
  }
  return null;
}
