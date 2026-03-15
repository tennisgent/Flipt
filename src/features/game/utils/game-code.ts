const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 4;

export const generateGameCode = (): string => {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
};

export const formatGameCode = (code: string): string => {
  return `FLIPT-${code.toUpperCase()}`;
};

export const parseGameCode = (input: string): string => {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.startsWith("FLIPT")) {
    return cleaned.slice(5);
  }
  return cleaned;
};
