export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

export class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionError";
  }
}

export function ok<T = undefined>(data?: T): ActionResult<T> {
  return { success: true, data: data as T };
}

export function fail<T = never>(error: unknown): ActionResult<T> {
  if (error instanceof ActionError) {
    return { success: false, error: error.message };
  }
  if (error instanceof Error) {
    return { success: false, error: error.message };
  }
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return { success: false, error: (error as { message: string }).message };
  }
  return { success: false, error: "Terjadi kesalahan yang tidak diketahui" };
}