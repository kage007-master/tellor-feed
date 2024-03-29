export const getDuration = (amount: number) => {
  return Math.floor((12 * 3600) / Math.floor(amount / 1e20));
};
