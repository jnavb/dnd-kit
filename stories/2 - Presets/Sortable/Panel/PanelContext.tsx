import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from 'react';

type Container = string[];
type DumbItem = {id: string; type: 'item'};
type Panel = {id: string; type: 'panel'; containerIds: string[]};
type Item = (Panel | DumbItem) & {size?: number};
type Items = Record<string, Item>;
type Containers = Record<string, Container>;

export type PanelContextState = {
  items: Items;
  containers: Containers;
};

export const ROOT_PANEL_ID = 'root-panel';

const initialState: PanelContextState = {
  items: {
    // Panels
    [ROOT_PANEL_ID]: {
      id: ROOT_PANEL_ID,
      type: 'panel',
      containerIds: [
        'root-container-1',
        'root-container-2',
        'root-container-3',
      ],
    },
    'panel-1': {
      id: 'panel-1',
      type: 'panel',
      containerIds: [
        'panel-1-container-1',
        'panel-1-container-2',
        'panel-1-container-3',
      ],
    },
    'panel-2': {
      id: 'panel-2',
      type: 'panel',
      containerIds: [
        'panel-2-container-1',
        'panel-2-container-2',
        'panel-2-container-3',
      ],
    },
    'panel-3': {
      id: 'panel-3',
      type: 'panel',
      containerIds: ['panel-3-container-1', 'panel-3-container-2'],
    },
    // Items
    A1: {id: 'A1', type: 'item'},
    A2: {id: 'A2', type: 'item'},
    A3: {id: 'A3', type: 'item'},
    A4: {id: 'A4', type: 'item'},
    A5: {id: 'A5', type: 'item'},
    A6: {id: 'A6', type: 'item'},
    A7: {id: 'A7', type: 'item'},
    A8: {id: 'A8', type: 'item'},
    A9: {id: 'A9', type: 'item'},
    A10: {id: 'A10', type: 'item'},
    B1: {id: 'B1', type: 'item'},
    B2: {id: 'B2', type: 'item'},
    B3: {id: 'B3', type: 'item'},
    B4: {id: 'B4', type: 'item'},
    B5: {id: 'B5', type: 'item'},
    B6: {id: 'B6', type: 'item'},
    B7: {id: 'B7', type: 'item'},
    B8: {id: 'B8', type: 'item'},
    B9: {id: 'B9', type: 'item'},
    B10: {id: 'B10', type: 'item'},
    C1: {id: 'C1', type: 'item'},
    C2: {id: 'C2', type: 'item'},
    C3: {id: 'C3', type: 'item'},
    C4: {id: 'C4', type: 'item'},
    C5: {id: 'C5', type: 'item'},
    C6: {id: 'C6', type: 'item'},
    C7: {id: 'C7', type: 'item'},
    C8: {id: 'C8', type: 'item'},
    C9: {id: 'C9', type: 'item'},
    C10: {id: 'C10', type: 'item'},
    D1: {id: 'D1', type: 'item'},
    D2: {id: 'D2', type: 'item'},
    D3: {id: 'D3', type: 'item'},
    D4: {id: 'D4', type: 'item'},
    D5: {id: 'D5', type: 'item'},
    D6: {id: 'D6', type: 'item'},
    D7: {id: 'D7', type: 'item'},
    D8: {id: 'D8', type: 'item'},
    D9: {id: 'D9', type: 'item'},
    D10: {id: 'D10', type: 'item'},
  },
  containers: {
    'root-container-1': ['A1', 'A2', 'A3', 'A4'],
    'root-container-2': ['panel-1'],
    'root-container-3': [],
    'panel-1-container-1': [],
    'panel-1-container-2': [],
    'panel-1-container-3': [],
    'panel-2-container-1': [],
    'panel-2-container-2': [],
    'panel-2-container-3': [],
    'panel-3-container-1': [],
    'panel-3-container-2': [],
  },
};

type PanelContext = {
  state: PanelContextState;
  // setState: React.Dispatch<React.SetStateAction<PanelContextState>>;
  activeId: string | null | undefined;
  setState: React.Dispatch<React.SetStateAction<PanelContextState>>;
  setActiveId: React.Dispatch<React.SetStateAction<string | null | undefined>>;
  setContainerIds: (
    panelId: string,
    fn: (containerIds: string[]) => string[]
  ) => void;
  setContainers: (
    panelId: string,
    fn: (items: Containers) => Containers
  ) => void;
};

const PanelsContext = createContext<PanelContext>({} as any);

export const usePanelsContext = () => useContext(PanelsContext);

export const PanelsContextProvider = ({children}: any) => {
  const [state, setState] = useState<PanelContextState>(initialState);
  const [activeId, setActiveId] = useState<string | null | undefined>();

  const setContainerIds = useCallback(
    (panelId: string, fn: (containerIds: string[]) => string[]) => {
      setState((state) => {
        const containerIds = (state.items[panelId] as Panel).containerIds;

        const newContainerIds = fn(containerIds);

        const patchPanel = {
          ...state.items[panelId],
          containerIds: newContainerIds,
        } as Panel;

        return {
          ...state,
          items: {
            ...state.items,
            [panelId]: patchPanel,
          },
        };
      });
    },
    []
  );

  const setContainers = useCallback(
    (panelId: string, fn: (containerIds: Containers) => Containers) => {
      setState((state) => {
        const newContainers = fn(state.containers);

        return {
          ...state,
          containers: {
            ...state.containers,
            ...newContainers,
          },
        };
      });
    },
    []
  );

  const panelsContextState = useMemo(
    () => ({
      state,
      activeId,
      setState,
      setActiveId,
      setContainerIds,
      setContainers,
    }),
    [state, activeId, setContainerIds, setContainers]
  );

  return (
    <PanelsContext.Provider value={panelsContextState}>
      {children}
    </PanelsContext.Provider>
  );
};
