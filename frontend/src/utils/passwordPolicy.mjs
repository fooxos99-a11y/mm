export const PASSWORD_MAX_LENGTH = 255;
export const PASSWORD_REQUIREMENTS_TEXT = 'أدخل كلمة المرور.';

export const passwordMeetsPolicy = (value) => {
  const password = String(value ?? '');

  return password.trim().length > 0 && [...password].length <= PASSWORD_MAX_LENGTH;
};

export const passwordConfirmationIsValid = (password, confirmation) => (
  passwordMeetsPolicy(password) && password === confirmation
);
