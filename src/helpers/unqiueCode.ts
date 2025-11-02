export const generateUniqueCode = () => {
  const code = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return code.substring(code.length - 4);
};
