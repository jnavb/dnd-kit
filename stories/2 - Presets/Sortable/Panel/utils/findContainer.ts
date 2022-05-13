import type {PanelContextState} from '../../4-MultipleContainers.story';

export const findContainer = (id: string, state: PanelContextState) => {
  if (id in state.containers) {
    return id;
  }

  return Object.keys(state.containers).find((containerIds) =>
    state.containers[containerIds].includes(id)
  );
};
