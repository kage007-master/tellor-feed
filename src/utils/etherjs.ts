import { ethers } from "ethers";
import Config from "@/config/settings";
import TellorFlexABI from "@/abis/TellorFlex.json";

const provider = new ethers.providers.JsonRpcProvider(Config.RPC_URL);

export const TellorFlex = new ethers.Contract(
  Config.CONTRACT_ADDRESS,
  TellorFlexABI,
  provider
);

export const getLastestSubmissionTimestamp = async () => {
  return Number(await TellorFlex.getTimeOfLastNewValue());
};

export const getCurrentTimeStamp = async () => {
  return Number((await provider.getBlock("latest"))?.timestamp);
};

export const getGasPrice = async () => {
  return Number((await provider.getFeeData()).gasPrice);
};

export const getAvailableEarning = async () => {
  const current = await getCurrentTimeStamp();
  const last = await getLastestSubmissionTimestamp();
  return (current - last) / 600;
};

export const getBlockNumber = async () => {
  return await provider.getBlockNumber();
};

export const getCode = async (address: string) => {
  return await provider.getCode(address);
};
