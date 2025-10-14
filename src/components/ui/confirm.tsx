"use client";

import { merge } from "lodash";
import * as React from "react";
import { ConfirmationAlertDialog, type ConfirmOptions } from "./alert-dialog";

type ConfirmReason = "confirm" | "cancel" | "natural" | "unmount";

interface ConfirmResult {
  confirmed: boolean;
  reason: ConfirmReason;
}

interface ConfirmContext {
  confirmBase: (
    parentId: string,
    options?: Partial<ConfirmOptions>,
  ) => Promise<ConfirmResult>;
  closeOnParentUnmount: (parentId: string) => void;
}

export const ConfirmContext = React.createContext<ConfirmContext>({
  confirmBase() {
    throw new Error("missing confirm provider");
  },
  closeOnParentUnmount() {},
});

const DEFAULT_OPTIONS = {
  title: "Are you sure?",
  description: "",
  confirmationText: "Ok",
  cancellationText: "Cancel",
  hideCancelButton: false,
  buttonOrder: ["cancel", "confirm"],
} satisfies ConfirmOptions;

let confirmGlobal: (
  options?: Partial<ConfirmOptions>,
) => Promise<ConfirmResult>;

const mergeOptions = (
  defaultOptions: Partial<ConfirmOptions>,
  options: Partial<ConfirmOptions>,
) => {
  return merge(DEFAULT_OPTIONS, defaultOptions, options);
};

export function ConfirmProvider({
  children,
  defaultOptions = {},
}: React.PropsWithChildren<{ defaultOptions?: ConfirmOptions }>) {
  // State that we clear on close (to avoid dangling references to resolve and
  // reject). If this is null, the dialog is closed.
  const [state, setState] = React.useState<{
    resolve: (value: ConfirmResult) => void;
    reject: (reason?: unknown) => void;
    parentId: string;
  } | null>(null);

  // Options for rendering the dialog, which aren't reset on close so that we
  // keep rendering the same modal during close animation
  const [options, setOptions] = React.useState<ConfirmOptions>({});
  const [key, setKey] = React.useState(0);

  const confirmBase = React.useCallback<
    (
      parentId: string,
      options?: Partial<ConfirmOptions>,
    ) => Promise<ConfirmResult>
  >((parentId, options = {}) => {
    return new Promise<ConfirmResult>((resolve, reject) => {
      setKey((key) => key + 1);
      setOptions(options ?? {});
      setState({ resolve, reject, parentId });
    });
  }, []);

  confirmGlobal = React.useCallback<
    (options?: Partial<ConfirmOptions>) => Promise<ConfirmResult>
  >(
    (options) => {
      return confirmBase("global", options);
    },
    [confirmBase],
  );

  const closeOnParentUnmount = React.useCallback<(parentId: string) => void>(
    (parentId) => {
      setState((state) => {
        if (state?.parentId === parentId) {
          state?.resolve({
            confirmed: false,
            reason: "unmount",
          });
          return null;
        }
        return state;
      });
    },
    [],
  );

  const handleClose = React.useCallback(() => {
    setState((state) => {
      state?.resolve({ confirmed: false, reason: "natural" });
      return null;
    });
  }, []);

  const handleCancel = React.useCallback(() => {
    setState((state) => {
      state?.resolve({ confirmed: false, reason: "cancel" });
      return null;
    });
  }, []);

  const handleConfirm = React.useCallback(() => {
    setState((state) => {
      state?.resolve({ confirmed: true, reason: "confirm" });
      return null;
    });
  }, []);

  return (
    <>
      <ConfirmContext.Provider value={{ confirmBase, closeOnParentUnmount }}>
        {children}
      </ConfirmContext.Provider>

      <ConfirmationAlertDialog
        key={key}
        open={state !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            handleClose();
          }
        }}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
        {...mergeOptions(defaultOptions, options)}
      />
    </>
  );
}

let confirmIdCounter = 0;
const useConfirmId = () => {
  const id = React.useMemo(() => {
    return confirmIdCounter++;
  }, []);

  return `confirm-${id}`;
};

export const useConfirm = () => {
  const parentId = useConfirmId();
  const { confirmBase, closeOnParentUnmount } =
    React.useContext(ConfirmContext);

  const confirm = React.useCallback<
    (options?: Partial<ConfirmOptions>) => Promise<ConfirmResult>
  >(
    (options) => {
      return confirmBase(parentId, options);
    },
    [confirmBase, parentId],
  );

  // When the component calling useConfirm is unmounted, we automatically
  // close the associated confirmation dialog. Note that we use a
  // unique id per each useConfirm usage, so that we don't close the
  // dialog when an unrelated component unmounts
  React.useEffect(() => {
    return () => {
      closeOnParentUnmount(parentId);
    };
  }, [parentId, closeOnParentUnmount]);

  return confirm;
};
