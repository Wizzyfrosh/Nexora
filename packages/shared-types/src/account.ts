export type AccountMailDelivery =
  | "QUEUED"
  | "UNAVAILABLE"
  | "UNCHANGED"
  | "ALREADY_VERIFIED";
export interface AccountMailResponse {
  delivery: AccountMailDelivery;
}
