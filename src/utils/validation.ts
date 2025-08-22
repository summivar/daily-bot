export const validateTelegramId = (id: number): bigint => {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('Invalid Telegram ID');
  }
  return BigInt(id);
};

export const validateRating = (rating: number): boolean => {
  return Number.isInteger(rating) && rating >= 1 && rating <= 10;
};

export const sanitizeText = (text: string): string => {
  return text
    .trim()
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
    .slice(0, 4000);
};

export const formatUserName = (
  firstName?: string | null,
  lastName?: string | null,
  username?: string | null
): string => {
  if (firstName) {
    return lastName ? `${firstName} ${lastName}` : firstName;
  }
  if (username) {
    return `@${username}`;
  }
  return 'Пользователь';
};