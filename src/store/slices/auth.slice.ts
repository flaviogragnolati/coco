import _ from "lodash";
import type { StateCreator } from "zustand";

import type { RoleType } from "~/prisma-client";

import type { RootState } from "./root";

export type AuthUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  roles: RoleType[];
};

export interface AuthState {
  user: AuthUser | null;
  roles: RoleType[];
}

export interface AuthActions {
  isLoggedIn: () => boolean;
  setUser: (user: AuthUser) => void;
  clearAuth: () => void;
}

export type AuthSliceState = AuthState & AuthActions;

export const defaultInitialState: AuthState = {
  user: null,
  roles: [],
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
    setUser: (user) =>
      set((state) => {
        state.user = user;
        state.roles = user.roles;
      }),
    clearAuth: () =>
      set((state) => {
        state.user = null;
        state.roles = [];
      }),
  });
};
