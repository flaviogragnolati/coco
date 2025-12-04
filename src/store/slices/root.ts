import type { MainSliceState, MainState } from "./main.slice";
import type { AuthSliceState, AuthState } from "./auth.slice";
import type { CollabSliceState, CollabState } from "./collab.slice";
import type { ModalSliceState, ModalState } from "./modal.slice";

export type RootState = MainSliceState &
  AuthSliceState &
  CollabSliceState &
  ModalSliceState;

export type RootInitialState = Partial<
  MainState & AuthState & CollabState & ModalState
>;
