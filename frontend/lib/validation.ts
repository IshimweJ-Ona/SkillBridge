// Mirrors backend/src/auth/dto/signup.dto.ts's password Matches() regex so
// the client can reject weak passwords before hitting the API.
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!PASSWORD_REGEX.test(password)) {
    return "Password must include uppercase, lowercase, a number, and a special character.";
  }
  return null;
}

export function validateEmail(email: string): string | null {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email) ? null : "Enter a valid email address.";
}

export function validatePhone(phone: string): string | null {
  const pattern = /^\+?[0-9\s().-]{7,20}$/;
  return pattern.test(phone) ? null : "Enter a valid phone number.";
}
