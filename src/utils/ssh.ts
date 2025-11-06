import { Client } from "ssh2";


export const streamRemoteCommand = (
  command: string,
  onData: (chunk: string) => void,
  onClose: () => void,
  onError?: (err: Error) => void
) => {
  const conn = new Client();

  conn
    .on("ready", () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          onError?.(err);
          conn.end();
          return;
        }

        stream
          .on("data", (chunk: Buffer) => onData(chunk.toString()))
          .stderr.on("data", (chunk: Buffer) => onData(`[stderr] ${chunk.toString()}`));

        stream.on("close", () => {
          onClose();
          conn.end();
        });
      });
    })
    .on("error", (err) => {
      onError?.(err);
    })
    .connect({
      host: process.env.EC2_HOST!,
      username: process.env.EC2_USER!,
      password: process.env.EC2_PASSWORD!,
      port: process.env.EC2_SSH_PORT ? parseInt(process.env.EC2_SSH_PORT, 10) : 22
    });
};
