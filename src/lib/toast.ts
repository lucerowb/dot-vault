import { toast as sonnerToast } from "sonner";

export const toast = sonnerToast;

export function toastSuccess(message: string) {
  sonnerToast.success(message);
}

export function toastError(message: string) {
  sonnerToast.error(message);
}

export function toastCopied(what = "Link") {
  sonnerToast.success(`${what} copied to clipboard`);
}
