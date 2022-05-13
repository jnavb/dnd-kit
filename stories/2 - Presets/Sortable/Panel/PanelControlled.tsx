import React, {useCallback, useEffect, useRef, useState} from 'react';
import {createPortal, unstable_batchedUpdates} from 'react-dom';
import {
  CancelDrop,
  closestCenter,
  pointerWithin,
  rectIntersection,
  CollisionDetection,
  DndContext,
  DragOverlay,
  DropAnimation,
  defaultDropAnimation,
  getFirstCollision,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  Modifiers,
  useDroppable,
  UniqueIdentifier,
  useSensors,
  useSensor,
  MeasuringStrategy,
  KeyboardCoordinateGetter,
} from '@dnd-kit/core';
import {
  AnimateLayoutChanges,
  SortableContext,
  useSortable,
  arrayMove,
  defaultAnimateLayoutChanges,
  verticalListSortingStrategy,
  SortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {coordinateGetter as multipleContainersCoordinateGetter} from '../multipleContainersKeyboardCoordinates';

import {Item, Container, ContainerProps} from '../../../components';

import {createRange} from '../../../utilities';
import {findContainer} from './utils/findContainer';
import {getIndex} from './utils/getIndex';
import {usePanelsContext, PanelContextState} from './PanelContext';

export default {
  title: 'Presets/Sortable/Multiple Containers',
};

const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  args.isSorting || args.wasDragging ? defaultAnimateLayoutChanges(args) : true;

function DroppableContainer({
  children,
  columns = 1,
  disabled,
  id,
  items,
  style,
  innerStyle,
  panelId,
  ...props
}: ContainerProps & {
  disabled?: boolean;
  id: string;
  panelId: string;
  items: string[];
  style?: React.CSSProperties;
}) {
  const {
    active,
    attributes,
    isDragging,
    listeners,
    over,
    setNodeRef,
    transition,
    transform,
  } = useSortable({
    id,
    data: {
      type: 'container',
      children: items,
      panelId,
    },
    animateLayoutChanges,
  });
  const isOverContainer = over
    ? (id === over.id && active?.data.current?.type !== 'container') ||
      items.includes(over.id)
    : false;

  return (
    <Container
      ref={disabled ? undefined : setNodeRef}
      innerStyle={innerStyle}
      style={{
        ...style,
        transition,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : undefined,
      }}
      hover={isOverContainer}
      handleProps={{
        ...attributes,
        ...listeners,
      }}
      columns={columns}
      {...props}
    >
      {children}
    </Container>
  );
}

const dropAnimation: DropAnimation = {
  ...defaultDropAnimation,
  dragSourceOpacity: 0.5,
};

type Items = Record<string, string[]>;

interface Props {
  id: string;
  adjustScale?: boolean;
  hideOverlay?: boolean;
  columns?: number;
  containerStyle?: React.CSSProperties;
  innerContainerStyle?: React.CSSProperties;
  multipleContainerStyle?: React.CSSProperties;
  addColumnStyle?: React.CSSProperties;
  getItemStyles?(args: {
    value: UniqueIdentifier;
    index: number;
    overIndex: number;
    isDragging: boolean;
    containerId: UniqueIdentifier;
    isSorting: boolean;
    isDragOverlay: boolean;
  }): React.CSSProperties;
  wrapperStyle?(args: {index: number; id: string}): React.CSSProperties;
  handle?: boolean;
  renderItem?: any;
  strategy?: SortingStrategy;
  minimal?: boolean;
  trashable?: boolean;
  scrollable?: boolean;
  vertical?: boolean;
  showAddContainer?: boolean;
  onAddColumn?: any;
}

export const TRASH_ID = 'void';
const PLACEHOLDER_ID = 'placeholder';
const empty: UniqueIdentifier[] = [];

export function MultipleContainersControlled({
  id,
  adjustScale = false,
  columns,
  handle = false,
  containerStyle,
  innerContainerStyle,
  multipleContainerStyle,
  addColumnStyle,
  getItemStyles = () => ({}),
  wrapperStyle = () => ({}),
  onAddColumn = () => ({}),
  minimal = false,
  renderItem,
  strategy = verticalListSortingStrategy,
  trashable = false,
  vertical = false,
  hideOverlay = false,
  showAddContainer = true,
  scrollable,
}: Props) {
  // TODO Remove this context subscription
  const {state, activeId} = usePanelsContext();

  const panel = state?.items[id]!;

  if (panel.type !== 'panel') return null;

  const containerIds = panel.containerIds;

  const isSortingContainer = activeId ? containerIds.includes(activeId) : false;

  const itemsByContainer: Items = containerIds.reduce(
    (items, containerId) => ({
      ...items,
      ...{[containerId]: state?.containers[containerId]},
    }),
    {}
  );

  return (
    <>
      <div
        style={{
          display: 'inline-grid',
          boxSizing: 'border-box',
          padding: 20,
          gridAutoFlow: vertical ? 'row' : 'column',
          ...multipleContainerStyle,
        }}
      >
        <SortableContext
          items={[...containerIds, PLACEHOLDER_ID]}
          strategy={
            vertical
              ? verticalListSortingStrategy
              : horizontalListSortingStrategy
          }
        >
          {containerIds.map((containerId) => (
            <DroppableContainer
              key={containerId}
              id={containerId}
              panelId={id}
              label={minimal ? undefined : `Column ${containerId}`}
              columns={columns}
              items={itemsByContainer[containerId]}
              scrollable={scrollable}
              style={containerStyle}
              innerStyle={innerContainerStyle}
              unstyled={minimal}
              // onRemove={() => handleRemove(containerId)}
            >
              <SortableContext
                items={itemsByContainer[containerId]}
                strategy={strategy}
              >
                {itemsByContainer[containerId].map((value, index) => {
                  return (
                    <SortableItem
                      disabled={isSortingContainer}
                      key={value}
                      id={value}
                      panelId={id}
                      index={index}
                      handle={handle}
                      style={getItemStyles}
                      wrapperStyle={wrapperStyle}
                      renderItem={renderItem}
                      containerId={containerId}
                      getIndex={getIndex}
                    />
                  );
                })}
              </SortableContext>
            </DroppableContainer>
          ))}
          {minimal && !showAddContainer ? undefined : (
            <DroppableContainer
              id={PLACEHOLDER_ID}
              panelId={id}
              disabled={isSortingContainer}
              style={addColumnStyle}
              items={empty}
              onClick={onAddColumn}
              placeholder
            >
              + Add column
            </DroppableContainer>
          )}
        </SortableContext>
      </div>
      {!hideOverlay &&
        createPortal(
          <DragOverlay adjustScale={adjustScale} dropAnimation={dropAnimation}>
            {activeId ? renderSortableItemDragOverlay(activeId) : null}
          </DragOverlay>,
          document.body
        )}
      {trashable && activeId && !containerIds.includes(activeId) ? (
        <Trash id={TRASH_ID} />
      ) : null}
    </>
  );

  function renderSortableItemDragOverlay(id: string) {
    return (
      <Item
        id={id}
        value={id}
        handle={handle}
        style={getItemStyles({
          containerId: findContainer(id, state!) as string,
          overIndex: -1,
          index: getIndex(id, state!),
          value: id,
          isSorting: true,
          isDragging: true,
          isDragOverlay: true,
        })}
        color={getColor(id)}
        wrapperStyle={wrapperStyle({index: 0, id})}
        renderItem={renderItem}
        dragOverlay
      />
    );
  }

  // function handleRemove(containerID: UniqueIdentifier) {
  //   setContainers((containers) =>
  //     containers.filter((id) => id !== containerID)
  //   );
  // }

  // function handleAddColumn() {
  //   const newContainerId = getNextContainerId();

  //   unstable_batchedUpdates(() => {
  //     setContainers((containers) => [...containers, newContainerId]);
  //     setItems((items) => ({
  //       ...items,
  //       [newContainerId]: [],
  //     }));
  //   });
  // }

  //function getNextContainerId() {
  //  const containerIds = Object.keys(itemsByContainer);
  //  const lastContainerId = containerIds[containerIds.length - 1];
  //
  //  return String.fromCharCode(lastContainerId.charCodeAt(0) + 1);
  //}
}

function getColor(id: string) {
  switch (id[0]) {
    case 'A':
      return '#7193f1';
    case 'B':
      return '#ffda6c';
    case 'C':
      return '#00bcd4';
    case 'D':
      return '#ef769f';
  }

  return undefined;
}

function Trash({id}: {id: UniqueIdentifier}) {
  const {setNodeRef, isOver} = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'fixed',
        left: '50%',
        marginLeft: -150,
        bottom: 20,
        width: 300,
        height: 60,
        borderRadius: 5,
        border: '1px solid',
        borderColor: isOver ? 'red' : '#DDD',
      }}
    >
      Drop here to delete
    </div>
  );
}

interface SortableItemProps {
  containerId: string;
  id: string;
  panelId: string;
  index: number;
  handle: boolean;
  disabled?: boolean;
  style(args: any): React.CSSProperties;
  getIndex(id: string, state: PanelContextState): number;
  renderItem(): React.ReactElement;
  wrapperStyle({index}: {index: number; id: string}): React.CSSProperties;
}

function SortableItem({
  disabled,
  id,
  panelId,
  index,
  handle,
  renderItem,
  style,
  containerId,
  getIndex,
  wrapperStyle,
}: SortableItemProps) {
  const {
    setNodeRef,
    listeners,
    isDragging,
    isSorting,
    over,
    overIndex,
    transform,
    transition,
  } = useSortable({
    id,
    data: {
      panelId,
    },
  });
  const mounted = useMountStatus();
  const mountedWhileDragging = isDragging && !mounted;
  // TODO Remove this context subscription
  const {state} = usePanelsContext();

  return (
    <Item
      ref={disabled ? undefined : setNodeRef}
      id={id}
      value={id}
      dragging={isDragging}
      sorting={isSorting}
      handle={handle}
      index={index}
      wrapperStyle={wrapperStyle({index, id})}
      style={style({
        index,
        value: id,
        isDragging,
        isSorting,
        overIndex: over ? getIndex(over.id, state!) : overIndex,
        containerId,
      })}
      color={getColor(id)}
      transition={transition}
      transform={transform}
      fadeIn={mountedWhileDragging}
      listeners={listeners}
      renderItem={renderItem}
    />
  );
}

function useMountStatus() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setIsMounted(true), 500);

    return () => clearTimeout(timeout);
  }, []);

  return isMounted;
}
