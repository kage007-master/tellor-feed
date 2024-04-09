"use client";

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import Moralis from "moralis";
import Config from "@/config/settings";
import { getGasUsage } from "@/utils/moralis";
import { getTokenPrice } from "@/utils/api";
import {
  getGasPrice,
  getCurrentTimeStamp,
  getLastestSubmissionTimestamp,
} from "@/utils/etherjs";

const status = { started: false };

export interface CounterState {
  recentEarnings: any[];
  gasPrice: number;
  tellorPrice: number;
  ethPrice: number;
  avaliableEarning: number;
  reporters: any[];
  currentTimeStamp: number;
  lastTimeStamp: number;
}

const initialState: CounterState = {
  recentEarnings: [],
  gasPrice: 0,
  tellorPrice: 105,
  ethPrice: 4000,
  avaliableEarning: 0,
  reporters: [],
  currentTimeStamp: 0,
  lastTimeStamp: 0,
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

export const counterSlice = createSlice({
  name: "counter",
  initialState,
  reducers: {
    getLastEarnings: (state, { payload }) => {
      state.recentEarnings = [
        {
          transaction_hash: payload.res.transactionHash,
          to_address: payload._reporter.toLocaleLowerCase(),
          value_decimal: payload.earning,
          fee:
            (Number(payload.res.gasUsed) *
              Number(payload.res.effectiveGasPrice)) /
            1e18,
        },
        ...state.recentEarnings,
      ];
      const idx = state.reporters.findIndex(
        (reporter) => reporter.to_address === payload._reporter
      );
      state.reporters[idx].lastTimeStamp = payload._time;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getRecentEarnings.pending, (state) => {});
    builder.addCase(getRecentEarnings.fulfilled, (state, { payload }) => {
      if (payload) state.recentEarnings = payload;
    });
    builder.addCase(getRecentEarnings.rejected, (state) => {});
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

export default counterSlice.reducer;

export const { getLastEarnings } = counterSlice.actions;
