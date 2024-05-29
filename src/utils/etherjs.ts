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

export const getBlockNumber = async () => {
  return await provider.getBlockNumber();
};

export const getCode = async (address: string) => {
  return await provider.getCode(address);
};
