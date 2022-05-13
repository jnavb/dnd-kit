import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type {CancelDrop} from '@dnd-kit/core';
import {
  horizontalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';

import {MultipleContainers, TRASH_ID} from './MultipleContainers';

import {ConfirmModal} from '../../components';
import {MultipleContainersContext} from './Panel/PanelDndContext';
import {MultipleContainersControlled} from './Panel/PanelControlled';
import {
  PanelsContextProvider,
  ROOT_PANEL_ID,
  usePanelsContext,
} from './Panel/PanelContext';

export default {
  title: 'Presets/Sortable/Multiple Containers',
};

export const BasicSetup = () => <MultipleContainers />;

export const ManyItems = () => (
  <MultipleContainers
    containerStyle={{
      maxHeight: '80vh',
    }}
    itemCount={15}
    scrollable
  />
);

const DynamicItem = (props: any) => {
  const {state} = usePanelsContext();
  const item = state.items[props.id];

  if (!item) {
    console.warn('Id not found', props);
    return;
  }

  if (item.type === 'item') return <>{item.id}</>;

  if (item.type === 'panel') {
    return <Panel id={item.id} hideOverlay={true} columns={item.size ?? 3} />;
  }

  return null;
};

const Panel = ({
  id,
  hideOverlay,
  columns,
}: {
  id: string;
  hideOverlay?: boolean;
  columns: number;
}) => {
  const {state} = usePanelsContext();
  return (
    <MultipleContainersControlled
      hideOverlay={hideOverlay}
      renderItem={DynamicItem}
      id={id}
      vertical
      columns={columns}
      strategy={horizontalListSortingStrategy}
      minimal
      showAddContainer={false}
      wrapperStyle={({id}) => {
        const item = state.items[id];
        const size =
          typeof item.size === 'number'
            ? item.size
            : item.type === 'panel'
            ? 3
            : 1;

        return {
          gridColumn: `span ${size} / span ${size}`,
          height: 'fit-content',
        };
      }}
      addColumnStyle={{
        minHeight: '100px',
      }}
      containerStyle={{
        outline: '1px solid #e5e5e5',
        minHeight: '92px',
        height: 'auto',
      }}
      innerContainerStyle={{
        gridAutoFlow: 'column',
      }}
      multipleContainerStyle={{
        width: '90%',
      }}
    />
  );
};

export const NestedPanels = () => {
  return (
    <PanelsContextProvider>
      <MultipleContainersContext>
        <Panel id={ROOT_PANEL_ID} columns={6} />
      </MultipleContainersContext>
    </PanelsContextProvider>
  );
};

export const Vertical = () => <MultipleContainers itemCount={5} vertical />;

export const TrashableItems = ({confirmDrop}: {confirmDrop: boolean}) => {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const resolveRef = React.useRef<(value: boolean) => void>();

  const cancelDrop: CancelDrop = async ({active, over}) => {
    if (over?.id !== TRASH_ID) {
      return true;
    }

    setActiveId(active.id);

    const confirmed = await new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });

    setActiveId(null);

    return confirmed === false;
  };

  return (
    <>
      <MultipleContainers
        cancelDrop={confirmDrop ? cancelDrop : undefined}
        trashable
      />
      {activeId && (
        <ConfirmModal
          onConfirm={() => resolveRef.current?.(true)}
          onDeny={() => resolveRef.current?.(false)}
        >
          Are you sure you want to delete "{activeId}"?
        </ConfirmModal>
      )}
    </>
  );
};

TrashableItems.argTypes = {
  confirmDrop: {
    name: 'Request user confirmation before deletion',
    defaultValue: false,
    control: {type: 'boolean'},
  },
};

export const Grid = () => (
  <MultipleContainers
    columns={2}
    strategy={rectSortingStrategy}
    wrapperStyle={() => ({
      width: 150,
      height: 150,
    })}
  />
);

export const VerticalGrid = () => (
  <MultipleContainers
    columns={2}
    itemCount={5}
    strategy={rectSortingStrategy}
    wrapperStyle={() => ({
      width: 150,
      height: 150,
    })}
    vertical
  />
);
