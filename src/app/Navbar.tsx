"use client";

import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { useEffect } from "react";
import { getPrices, setPrices } from "@/lib/home/homeSlice";
import Config from "@/config/settings";
import Link from "next/link";
import Image from "next/image";
import { shortenName } from "@/utils/string";
import { Button } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import { socket } from "@/lib/socket";

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
    socket.on("TokenPrices", (res: any) => {
      dispatch(setPrices(res.data));
    });
    return () => {
      socket.off("TokenPrices");
      clearInterval(id);
    };
  }, []);
  return (
    <nav className="!z-50 flex gap-4 px-5 py-2 fixed bg-[#aaa] w-full">
      <div>Gas: {(gasPrice / 1e9).toFixed(0)} Gwei</div>
      <div className="flex items-center gap-1">
        <Image src="/ETH.png" width={20} height={20} alt="eth" />
        ETH: ${ethPrice}
      </div>
      <div className="flex items-center gap-1">
        <Image src="/TRB.png" width={20} height={20} alt="trb" />
        TRB: ${tellorPrice}
      </div>
      <div>Reward: {avaliableEarning}</div>
      <div>
        Profit: $
        {(
          avaliableEarning * tellorPrice -
          ((gasPrice * 272954) / 1e18) * ethPrice
        ).toFixed(2)}
      </div>
      <div className="ml-auto flex gap-2 items-center">
        Contract: {shortenName(Config.CONTRACT_ADDRESS, 12)}
        <Link
          target="_blank"
          href={`https://etherscan.io/address/${Config.CONTRACT_ADDRESS}/#tokentxns`}
        >
          <Image src={"/etherscan.png"} width={20} height={20} alt="debank" />
        </Link>
        <Link
          target="_blank"
          href={`https://debank.com/profile/${Config.CONTRACT_ADDRESS}/history?chain=eth`}
        >
          <Image src={"/debank.png"} width={20} height={20} alt="debank" />
        </Link>
        <Button
          type="text"
          size="small"
          shape="circle"
          icon={<CopyOutlined />}
          onClick={async () =>
            await navigator.clipboard.writeText(Config.CONTRACT_ADDRESS)
          }
        />
      </div>
    </nav>
  );
}
