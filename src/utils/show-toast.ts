import { toast } from "sonner";

type ToastTypes =
  | "normal"
  | "action"
  | "success"
  | "info"
  | "warning"
  | "error"
  | "loading"
  | "default";

type ToastOptions = Parameters<typeof toast>[1];

const toastDefaultOptions: ToastOptions = {};

export const showToast = (
  type: ToastTypes,
  message: string,
  options?: ToastOptions,
) => {
  switch (type) {
    case "success":
      toast.success(message, { ...toastDefaultOptions, ...options });
      break;
    case "info":
      toast.info(message, { ...toastDefaultOptions, ...options });
      break;
    case "warning":
      toast.warning(message, { ...toastDefaultOptions, ...options });
      break;
    case "error":
      toast.error(message, { ...toastDefaultOptions, ...options });
      break;
    case "loading":
      toast.loading(message, { ...toastDefaultOptions, ...options });
      break;
    case "action":
      toast(message, { ...toastDefaultOptions, ...options });
      break;
    default:
      toast(message, { ...toastDefaultOptions, ...options });
      toast(message, { ...toastDefaultOptions, ...options });
      break;
  }
};
