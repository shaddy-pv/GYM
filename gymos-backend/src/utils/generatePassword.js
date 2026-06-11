/**
 * Generate a random 8-character alphanumeric password
 * e.g., "Gym@3xK9"
 */
const generatePassword = () => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '@#$!';

  const allChars = upper + lower + digits + special;

  // Guarantee at least one of each required type
  let password =
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    digits[Math.floor(Math.random() * digits.length)] +
    special[Math.floor(Math.random() * special.length)];

  // Fill remaining 4 characters
  for (let i = 0; i < 4; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle to avoid predictable positions
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
};

module.exports = { generatePassword };
