"use client";

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import Moralis from "moralis";
import { getGasUsage } from "@/utils/moralis";
import Config from "@/config/settings";
import { getTokenPrice } from "@/utils/api";
import {
  getGasPrice,
  getCurrentTimeStamp,
  getLastestSubmissionTimestamp,
  getBlockNumber,
} from "@/utils/etherjs";

const status = { started: false };

export interface CounterState {
  value: number;
  recentEarnings: any[];
  gasPrice: number;
  tellorPrice: number;
  ethPrice: number;
  avaliableEarning: number;
  reporters: any[];
  currentTimeStamp: number;
  lastTimeStamp: number;
  transactions: any[];
  totalFee: number;
  trbBalance: number;
}

const initialState: CounterState = {
  value: 0,
  recentEarnings: [],
  gasPrice: 0,
  tellorPrice: 105,
  ethPrice: 4000,
  avaliableEarning: 0,
  reporters: [],
  currentTimeStamp: 0,
  lastTimeStamp: 0,
  transactions: [],
  totalFee: 0,
  trbBalance: 0,
};

export const getPrices = createAsyncThunk(`getPrices`, async () => {
  try {
    return {
      ethPrice: await getTokenPrice("ETH"),
      tellorPrice: await getTokenPrice("TRB"),
      gasPrice: await getGasPrice(),
      currentTimeStamp: await getCurrentTimeStamp(),
      lastTimeStamp: await getLastestSubmissionTimestamp(),
    };
  } catch (e) {
    console.error(e);
  }
});

export const getReporters = createAsyncThunk(`getReporters`, async () => {
  try {
    const { data } = await axios.post(Config.SUBGRAPH_URL, {
      query: `{
      newStakers(where: {_amount_gte: "100000000000000000000"}) {
        id
        _staker
        _amount
        _lockedBalance
        blockNumber
        blockTimestamp
        lastTimestamp
      }
    }`,
    });
    return data;
  } catch (e) {
    console.error(e);
  }
});

export const getRecentEarnings = createAsyncThunk(
  `getRecentEarnings`,
  async () => {
    try {
      if (!status.started) {
        status.started = true;
        await Moralis.start({ apiKey: Config.MORALIS_APIKEY });
      }

      const response = await Moralis.EvmApi.token.getWalletTokenTransfers({
        chain: "0x1",
        limit: 10,
        order: "DESC",
        address: Config.CONTRACT_ADDRESS,
      });

      const response1 = await Moralis.EvmApi.transaction.getWalletTransactions({
        chain: "0x1",
        limit: 10,
        order: "DESC",
        address: Config.CONTRACT_ADDRESS,
      });

      const filtered = response.raw.result.filter((tx) => {
        return tx.to_address.toLocaleLowerCase() !== Config.CONTRACT_ADDRESS;
      });

      const withGasUage = [];
      for (let i = 0; i < filtered.length; i++) {
        const tx = response1.raw.result.find(
          (txID) => txID.hash === filtered[i].transaction_hash
        );
        withGasUage.push({
          ...filtered[i],
          fee: tx
            ? (Number(tx.receipt_gas_used) * Number(tx.gas_price)) / 1e18
            : await getGasUsage(filtered[i].transaction_hash),
        });
      }

      return withGasUage;
    } catch (e) {
      console.error(e);
    }
  }
);

export const getLastEarnings = createAsyncThunk(`getLastEarnings`, async () => {
  try {
    if (!status.started) {
      status.started = true;
      await Moralis.start({ apiKey: Config.MORALIS_APIKEY });
    }

    const response = await Moralis.EvmApi.token.getWalletTokenTransfers({
      chain: "0x1",
      limit: 1,
      order: "DESC",
      address: Config.CONTRACT_ADDRESS,
    });

    const filtered = response.raw.result.filter((tx) => {
      return tx.to_address.toLocaleLowerCase() !== Config.CONTRACT_ADDRESS;
    });

    const withGasUage = [];
    for (let i = 0; i < filtered.length; i++)
      withGasUage.push({
        ...filtered[i],
        fee: await getGasUsage(filtered[i].transaction_hash),
      });

    return withGasUage;
  } catch (e) {
    console.error(e);
  }
});

export const getTransactions = createAsyncThunk(
  `getTransactions`,
  async (address: string) => {
    try {
      if (!status.started) {
        status.started = true;
        await Moralis.start({ apiKey: Config.MORALIS_APIKEY });
      }
      let txs: any[] = [],
        transfers: any[] = [];

      let blockNumber = await getBlockNumber();
      while (1) {
        const response = await Moralis.EvmApi.transaction.getWalletTransactions(
          {
            chain: "0x1",
            limit: 100,
            order: "DESC",
            toBlock: blockNumber,
            address: address,
          }
        );
        txs = [...txs, ...response.raw.result];
        if (response.raw.result.length === 0) break;
        blockNumber =
          Number(
            response.raw.result[response.raw.result.length - 1].block_number
          ) - 1;
      }

      blockNumber = await getBlockNumber();
      while (1) {
        const response = await Moralis.EvmApi.token.getWalletTokenTransfers({
          chain: "0x1",
          limit: 100,
          order: "DESC",
          toBlock: blockNumber,
          address: address,
        });
        transfers = [...transfers, ...response.raw.result];
        if (response.raw.result.length === 0) break;
        blockNumber =
          Number(
            response.raw.result[response.raw.result.length - 1].block_number
          ) - 1;
      }

      const withTokenTransfer = txs.map((tx) => {
        const transfer = transfers.find((txID) => {
          return (
            tx.hash === txID.transaction_hash &&
            txID.from_address === Config.CONTRACT_ADDRESS
          );
        });
        return {
          ...tx,
          trb: transfer
            ? Number(transfer.value_decimal) > 10
              ? 0
              : Number(transfer.value_decimal)
            : 0,
          key: tx.hash,
        };
      });
      return withTokenTransfer;
    } catch (e) {
      console.error(e);
    }
  }
);

export const counterSlice = createSlice({
  name: "counter",
  initialState,
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getRecentEarnings.pending, (state) => {});
    builder.addCase(getRecentEarnings.fulfilled, (state, { payload }) => {
      if (payload) state.recentEarnings = payload;
    });
    builder.addCase(getRecentEarnings.rejected, (state) => {});
    builder.addCase(getTransactions.pending, (state) => {});
    builder.addCase(getTransactions.fulfilled, (state, { payload }) => {
      if (payload) {
        state.transactions = payload;
        state.totalFee = 94521080000000000;
        state.trbBalance = 0;
        for (var i = 0; i < payload.length; i++) {
          state.totalFee +=
            Number(payload[i].receipt_gas_used) * Number(payload[i].gas_price);
          state.trbBalance += payload[i].trb;
        }
      }
    });
    builder.addCase(getTransactions.rejected, (state) => {});
    builder.addCase(getLastEarnings.pending, (state) => {});
    builder.addCase(getLastEarnings.fulfilled, (state, { payload }) => {
      if (
        payload &&
        payload[0].to_address !== state.recentEarnings[0].to_address
      )
        state.recentEarnings = [...payload, ...state.recentEarnings].splice(
          0,
          10
        );
    });
    builder.addCase(getLastEarnings.rejected, (state) => {});
    builder.addCase(getPrices.pending, (state) => {});
    builder.addCase(getPrices.fulfilled, (state, { payload }) => {
      if (payload) {
        state.ethPrice = payload.ethPrice;
        state.tellorPrice = payload.tellorPrice;
        state.gasPrice = payload.gasPrice;
        state.currentTimeStamp = payload.currentTimeStamp;
        state.lastTimeStamp = payload.lastTimeStamp;
        state.avaliableEarning =
          (payload.currentTimeStamp - payload.lastTimeStamp) / 600;
      }
    });
    builder.addCase(getPrices.rejected, (state) => {});
    builder.addCase(getReporters.pending, (state) => {});
    builder.addCase(getReporters.fulfilled, (state, { payload }) => {
      if (payload) state.reporters = payload.data.newStakers;
    });
    builder.addCase(getReporters.rejected, (state) => {});
  },
});

export const { increment } = counterSlice.actions;
export default counterSlice.reducer;
