import { useSyncExternalStore } from 'react';

import type { UniversityInstitutionProfile } from '@/content/types';
import { IS_TEST_MODE } from '@/lib/apiClient';

type UniversityAdminHeaderState = Pick<
  UniversityInstitutionProfile,
  'adminFirstName' | 'adminLastName' | 'logoSrc'
>;

const listeners = new Set<() => void>();

function createMockState(): UniversityAdminHeaderState {
  return {
    adminFirstName: 'Jonathan',
    adminLastName: 'Acevedo',
    logoSrc: null,
  };
}

function createRuntimeInitialState(): UniversityAdminHeaderState {
  return {
    adminFirstName: '',
    adminLastName: '',
    logoSrc: null,
  };
}

function areEqualHeaders(
  currentState: UniversityAdminHeaderState,
  nextState: UniversityAdminHeaderState,
) {
  return (
    currentState.adminFirstName === nextState.adminFirstName &&
    currentState.adminLastName === nextState.adminLastName &&
    currentState.logoSrc === nextState.logoSrc
  );
}

let state = IS_TEST_MODE ? createMockState() : createRuntimeInitialState();

function emitChange() {
  listeners.forEach((listener) => {
    listener();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

export function syncUniversityAdminHeaderState(
  header: UniversityAdminHeaderState,
) {
  const nextState = {
    adminFirstName: header.adminFirstName,
    adminLastName: header.adminLastName,
    logoSrc: header.logoSrc,
  };

  if (areEqualHeaders(state, nextState)) {
    return;
  }

  state = nextState;
  emitChange();
}

export function resetUniversityAdminHeaderState() {
  state = IS_TEST_MODE ? createMockState() : createRuntimeInitialState();
  emitChange();
}

export function useUniversityAdminHeaderStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
