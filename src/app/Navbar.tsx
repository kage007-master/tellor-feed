"use client";

import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { useEffect } from "react";
import { getPrices } from "@/lib/home/homeSlice";

export default function Navbar() {
  const { gasPrice, ethPrice, tellorPrice, avaliableEarning } = useSelector(
    (state: RootState) => state.home
  );
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(getPrices());
    const id = setInterval(() => {
      dispatch(getPrices());
    }, 12000);
    return () => {
      clearInterval(id);
    };
  }, []);
  return (
    <nav className="!z-50 flex gap-2 px-5 py-2 fixed bg-[#aaa] w-full">
      <div>Gas: {(gasPrice / 1e9).toFixed(0)} Gwei</div>
      <div>ETH: {ethPrice}</div>
      <div>TRB: {tellorPrice}</div>
      <div>Current Rewards: {avaliableEarning}</div>
      <div>
        Estimated Earning:{" "}
        {(
          avaliableEarning * tellorPrice -
          ((gasPrice * 272954) / 1e18) * ethPrice
        ).toFixed(2)}
      </div>
    </nav>
  );
}
