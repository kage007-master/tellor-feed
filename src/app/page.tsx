"use client";

import Image from "next/image";
import { AppDispatch, type RootState } from "@/lib/store";
import { useSelector, useDispatch } from "react-redux";
import {
  getLastEarnings,
  getRecentEarnings,
  getReporters,
} from "@/lib/home/homeSlice";
import { useEffect, useState } from "react";
import { shortenName, secondsToHMS } from "@/utils/string";
import { Button, Checkbox, Table } from "antd";
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
import { names, notWorkingList } from "@/utils/const";

const StakerNames: any = names;

interface DataType {
  key: React.Key;
  id: string;
  name: string;
  _amount: number;
  _lockedBalance: number;
  address: string;
  lastTimestamp: number;
  isContract: boolean;
}

let prevTimeStamp = 0;
export default function Home() {
  const { ethPrice, tellorPrice, currentTimeStamp, reporters, lastTimeStamp } =
    useSelector((state: RootState) => state.home);
  const [hideNotWorking, setHideNotWorking] = useState(false);
  const recentEarnings = useSelector(
    (state: RootState) => state.home.recentEarnings
  );
  const dispatch = useDispatch<AppDispatch>();
  useEffect(() => {
    dispatch(getRecentEarnings());
    dispatch(getReporters());
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
            dispatch(
              getLastEarnings({ res, earning, _reporter, _time, reporters })
            );
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
      render: (address, _v) => (
        <div className="flex gap-2">
          <Link
            target="_blank"
            className={`${
              address === Config.MY_ADDRESS
                ? "text-[red]"
                : StakerNames[address]
                ? "text-[#2d8cf3]"
                : _v.isContract
                ? "text-[blue]"
                : "text-white"
            }`}
            href={`/detail/${address}`}
          >
            {StakerNames[address]
              ? StakerNames[address]
              : shortenName(address, 12)}
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
      render: (lastTimestamp, data) => {
        let seconds =
          currentTimeStamp - lastTimestamp - getDuration(data._amount);
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
    <div className="mx-20 h-full mt-12">
      <div className="flex gap-2 justify-center">
        <div className="flex gap-2 max-w-[80%] overflow-auto">
          {recentEarnings.map((earning: any) => (
            <div
              key={earning.transaction_hash}
              className="p-1.5 bg-[#172135] rounded-md border border-[#323546] min-w-[118px] text-center mb-1"
            >
              <p>
                {shortenName(earning.to_address)} :{" "}
                {Number(earning.value_decimal).toFixed(2)}
              </p>
              <p>
                $
                {(
                  Number(earning.value_decimal) * tellorPrice -
                  earning.fee * ethPrice
                ).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
        <Button
          type="primary"
          size="small"
          shape="circle"
          icon={<SyncOutlined />}
          onClick={() => dispatch(getRecentEarnings())}
        />
      </div>
      <Checkbox
        checked={hideNotWorking}
        onChange={() => setHideNotWorking(!hideNotWorking)}
      >
        Hide Not Working
      </Checkbox>
      <Table
        className="my-3 !z-0"
        columns={columns}
        dataSource={
          hideNotWorking
            ? reporters.filter(
                (reporter) =>
                  notWorkingList.findIndex(
                    (address) => address === reporter.id.toLocaleLowerCase()
                  ) == -1 &&
                  (reporter.id.toLocaleLowerCase() !==
                    "0xa8d96836517ae9d3a46b3f99190ed984f74adfd3" ||
                    currentTimeStamp - reporter.lastTimestamp > 3600 * 12)
              )
            : reporters
        }
        pagination={false}
        size="small"
      />
    </div>
  );
}
