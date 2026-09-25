export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_REQUIREMENTS_TEXT = '10 أحرف على الأقل، وتتضمن حرفًا ورقمًا';

const LETTER_PATTERN = /\p{L}/u;
const NUMBER_PATTERN = /\p{N}/u;

export const passwordMeetsPolicy = (value) => {
  const password = String(value || '');

  return password.length >= PASSWORD_MIN_LENGTH
    && LETTER_PATTERN.test(password)
    && NUMBER_PATTERN.test(password);
};

export const passwordConfirmationIsValid = (password, confirmation) => (
  passwordMeetsPolicy(password) && password === confirmation
);
