export const PASSWORD_LENGTH = 8;
export const PASSWORD_REQUIREMENTS_TEXT = '8 أرقام فقط';

const NON_DIGIT_PATTERN = /[^\p{Nd}]/u;

export const passwordMeetsPolicy = (value) => {
  const password = String(value || '');

  return [...password].length === PASSWORD_LENGTH
    && !NON_DIGIT_PATTERN.test(password);
};

export const passwordConfirmationIsValid = (password, confirmation) => (
  passwordMeetsPolicy(password) && password === confirmation
);
