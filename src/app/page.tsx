"use client";

import Image from "next/image";
import { AppDispatch, type RootState } from "@/lib/store";
import { useSelector, useDispatch } from "react-redux";
import {
  getLastEarnings,
  getRecentEarnings,
  getReporters,
} from "@/lib/home/homeSlice";
import { useEffect } from "react";
import { shortenName, secondsToHMS } from "@/utils/string";
import { Button, Table } from "antd";
import type { TableColumnsType } from "antd";
import {
  CheckCircleTwoTone,
  CloseCircleTwoTone,
  SyncOutlined,
  WarningTwoTone,
} from "@ant-design/icons";
import { getDuration } from "@/utils/math";
import Config from "@/config/settings";
import Link from "next/link";
import { TellorFlex } from "@/utils/etherjs";

interface DataType {
  key: React.Key;
  id: string;
  name: string;
  _amount: number;
  _lockedBalance: number;
  address: string;
  lastTimestamp: number;
}

let prevTimeStamp = 0;
export default function Home() {
  const { ethPrice, tellorPrice, currentTimeStamp, reporters, lastTimeStamp } =
    useSelector((state: RootState) => state.home);
  const recentEarnings = useSelector(
    (state: RootState) => state.home.recentEarnings
  );
  const dispatch = useDispatch<AppDispatch>();
  useEffect(() => {
    dispatch(getRecentEarnings());
    dispatch(getReporters());
    console.log("useEffect test");
  }, []);

  useEffect(() => {
    if (lastTimeStamp) {
      if (!prevTimeStamp) {
        prevTimeStamp = lastTimeStamp;
        TellorFlex.on(
          "NewReport",
          async (
            _queryId,
            _time,
            _value,
            _nonce,
            _queryData,
            _reporter,
            ...rest: any
          ) => {
            const { getTransactionReceipt } = rest[0];
            const earning = (_time - prevTimeStamp) / 600;
            prevTimeStamp = _time;
            const res = await getTransactionReceipt();
            dispatch(getLastEarnings({ res, earning }));
            dispatch(getReporters());
          }
        );
      }
    }
  }, [lastTimeStamp]);

  const columns: TableColumnsType<DataType> = [
    {
      title: "No",
      render: (_v, _d, _index) => _index + 1,
    },
    {
      title: "Address",
      dataIndex: "id",
      render: (address) => (
        <div className="flex gap-2">
          <Link
            target="_blank"
            className={`${
              address === Config.MY_ADDRESS ? "text-[red]" : "text-white"
            }`}
            href={`/detail/${address}`}
          >
            {shortenName(address, 12)}
          </Link>
          <Link
            target="_blank"
            href={`https://etherscan.io/address/${address}`}
          >
            <Image src={"/etherscan.png"} width={20} height={20} alt="debank" />
          </Link>
          <Link
            target="_blank"
            href={`https://debank.com/profile/${address}/history?chain=eth`}
          >
            <Image src={"/debank.png"} width={20} height={20} alt="debank" />
          </Link>
        </div>
      ),
    },
    {
      title: "Amount",
      dataIndex: "_amount",
      sorter: (a, b) => a._amount - b._amount,
      render: (_amount) => (_amount / 1e18).toFixed(0),
    },
    {
      title: "Locked Amount",
      dataIndex: "_lockedBalance",
      sorter: (a, b) => a._lockedBalance - b._lockedBalance,
      render: (_lockedBalance) => (_lockedBalance / 1e18).toFixed(0),
    },
    {
      title: "Duration",
      dataIndex: "_amount",
      sorter: (a, b) => a._amount - b._amount,
      render: (_amount) => {
        let seconds = Math.floor((12 * 3600) / Math.floor(_amount / 1e20));
        return <>{secondsToHMS(seconds)}</>;
      },
    },
    {
      title: "Remained Time",
      dataIndex: "lastTimestamp",
      render: (lastTimeStamp, data) => {
        let seconds =
          currentTimeStamp - lastTimeStamp - getDuration(data._amount);
        let minus = seconds > 0 ? 1 : 0;
        seconds = Math.abs(seconds);
        return (
          <div
            className={`${
              data.id === Config.MY_ADDRESS ? "text-[red]" : "text-white"
            } flex gap-2`}
          >
            {minus ? "-" : ""}
            {secondsToHMS(seconds)}
            {minus ? (
              <CheckCircleTwoTone twoToneColor="#0f0" />
            ) : (
              <CloseCircleTwoTone twoToneColor="#f00" />
            )}
            {(minus && seconds < getDuration(data._amount)) ||
            (!minus && seconds < 600) ? (
              <WarningTwoTone twoToneColor="#FFC048" />
            ) : (
              <></>
            )}
          </div>
        );
      },
      defaultSortOrder: "descend",
      sorter: (a, b) => {
        return (
          -a.lastTimestamp -
          getDuration(a._amount) -
          (-b.lastTimestamp - getDuration(b._amount))
        );
      },
    },
    // {
    //   title: "Actions",
    //   render: () => {
    //     return (
    //       <>
    //         <Button icon={<ProfileTwoTone />}></Button>
    //       </>
    //     );
    //   },
    // },
  ];
  return (
    <div className="w-full h-full mt-12">
      <div className="flex gap-2 justify-center">
        {recentEarnings.map((earning: any) => (
          <div
            key={earning.transaction_hash}
            className="p-1.5 bg-[#172135] rounded-md border border-[#323546]"
          >
            <p>
              {shortenName(earning.to_address)} :{" "}
              {Number(earning.value_decimal).toFixed(2)}
            </p>
            <p className="text-center">
              $
              {(
                Number(earning.value_decimal) * tellorPrice -
                earning.fee * ethPrice
              ).toFixed(2)}
            </p>
          </div>
        ))}
        <Button
          type="primary"
          size="small"
          shape="circle"
          icon={<SyncOutlined />}
          onClick={() => dispatch(getRecentEarnings())}
        />
      </div>
      <Table
        className="mx-20 my-3 !z-0"
        columns={columns}
        dataSource={reporters}
        pagination={false}
        size="small"
      />
    </div>
  );
}
