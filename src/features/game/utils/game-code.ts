const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

export const generateGameCode = (): string => {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
};

export const formatGameCode = (code: string): string => {
  return code.toUpperCase();
};

export const parseGameCode = (input: string): string => {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
};
