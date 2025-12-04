import _ from "lodash";
import type { StateCreator } from "zustand";

import type { RootState } from "./root";

export interface AuthState {
  user: any;
  role: string;
}

export interface AuthActions {
  isLoggedIn: () => boolean;
}

export type AuthSliceState = AuthState & AuthActions;

export const defaultInitialState: AuthState = {
  user: null,
  role: "guest",
};

/**
 *
 * Factory function that creates the auth slice with the initial state
 * and the actions that can be performed on the slice.
 * @param initState: The initial state of the auth slice
 * StateCreator is a generic type that takes 4 parameters
 * @param RootState: The combined state of all slices
 * @param StoreMutatorsIdentifiers: An array of middlewares type definitions
 * @param NotUsed: Should be an empty array
 * @param AuthSliceState: The state of the auth slice
 */
export const createAuthSlice: (
  initState?: Partial<AuthState>,
) => StateCreator<
  RootState,
  [
    ["zustand/persist", unknown],
    ["zustand/devtools", never],
    ["zustand/immer", never],
  ],
  [],
  AuthSliceState
> = (initState) => {
  const initialState = _.merge({}, defaultInitialState, initState);
  return (set, get) => ({
    ...initialState,
    isLoggedIn: () => {
      const { user } = get();
      return !!user;
    },
  });
};
