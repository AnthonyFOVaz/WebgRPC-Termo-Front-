import { createPromiseClient } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-web";
import { Termo } from "../gen/termo_connect";
import { mockTermoClient } from "./mockClient";

const baseUrl =
  import.meta.env.VITE_GRPC_URL ||
  (import.meta.env.PROD ? window.location.origin : "http://localhost:8080");

const useMock = import.meta.env.VITE_USE_MOCK_BACKEND === "1";

// Production path:
// Browser -> Caddy (/Termo/*) -> Envoy gRPC-Web -> Java gRPC backend.
export const transport = createGrpcWebTransport({
  baseUrl,
});

// Mock is only for frontend development before the Java backend is ready.
// Leave VITE_USE_MOCK_BACKEND unset/0 when testing against the real backend.
export const termoClient = (
  useMock ? mockTermoClient : createPromiseClient(Termo, transport)
) as ReturnType<typeof createPromiseClient<typeof Termo>>;
