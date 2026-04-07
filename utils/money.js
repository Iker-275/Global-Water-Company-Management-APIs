const roundMoney = (value) => {
  return Math.round((Number(value) + Number.EPSILON) * 10) / 10;
};

const normalizeZero = (value) => {
  return Math.abs(value) < 0.05 ? 0 : value; // adjusted for 1dp
};

const cleanMoney = (value) => {
  return normalizeZero(roundMoney(value));
};

module.exports = { roundMoney, normalizeZero, cleanMoney };