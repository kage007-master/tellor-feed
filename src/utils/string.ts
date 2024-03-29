export const shortenName = (address: string, length: number = 6) => {
  return address.slice(0, length);
};

export const secondsToHMS = (secs: number) => {
  var hours = Math.floor(secs / 3600);
  var minutes = Math.floor(secs / 60) % 60;
  var seconds = secs % 60;

  return [hours, minutes, seconds]
    .map((v) => (v < 10 ? "0" + v : v))
    .filter((v, i) => v !== "00" || i >= 0)
    .join(":");
};
