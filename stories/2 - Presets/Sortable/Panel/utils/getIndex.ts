import {findContainer} from './findContainer';
import type {PanelContextState} from '../../4-MultipleContainers.story';

export const getIndex = (id: string, state: PanelContextState) => {
  const container = findContainer(id, state);

  if (!container) {
    return -1;
  }

  const index = state.containers[container].indexOf(id);

  return index;
};
