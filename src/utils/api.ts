import axios from "axios";

export const getTokenPrice = async (tokenName: string) => {
  try {
    const price = (
      await axios.get("https://api.binance.com/api/v3/ticker/price", {
        params: {
          symbol: `${tokenName}USDT`,
        },
      })
    ).data.price;
    return Number(price);
  } catch (e) {
    return 0;
  }
};
