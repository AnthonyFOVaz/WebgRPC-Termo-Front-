import { createPromiseClient } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-web";
import { Termo } from "../gen/termo_connect";

const baseUrl =
  import.meta.env.VITE_GRPC_URL ||
  (import.meta.env.PROD ? window.location.origin : "http://localhost:8080");

export const transport = createGrpcWebTransport({
  baseUrl,
});

export const termoClient = createPromiseClient(Termo, transport);
