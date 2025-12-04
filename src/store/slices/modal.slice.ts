import _ from "lodash";
import type { StateCreator } from "zustand";

import type { RootState } from "./root";

export interface ModalState {
  open: boolean;
  action: string | null;
  payload?: unknown;
}

export interface ModalActions {
  openModal: (params: { action: string; payload?: unknown }) => void;
  closeModal: () => void;
}

export type ModalSliceState = ModalState & ModalActions;

export const defaultInitialState: ModalState = {
  open: false,
  action: null,
  payload: undefined,
};

/**
 * Factory function that creates the modal slice with the initial state
 * and the actions that can be performed on the slice.
 * @param initState - The initial state of the modal slice
 */
export const createModalSlice: (
  initState?: Partial<ModalState>,
) => StateCreator<
  RootState,
  [
    ["zustand/persist", unknown],
    ["zustand/devtools", never],
    ["zustand/immer", never],
  ],
  [],
  ModalSliceState
> = (initState) => {
  const initialState = _.merge({}, defaultInitialState, initState);
  return (set, get) => ({
    ...initialState,
    openModal: ({ action, payload }) =>
      set((draft) => {
        draft.open = true;
        draft.action = action;
        draft.payload = payload;
      }),
    closeModal: () =>
      set((draft) => {
        draft.open = false;
        draft.action = null;
        draft.payload = undefined;
      }),
  });
};
