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
import {
  usePanelsContext,
  PanelsContextProvider,
  PanelContextState,
} from './PanelContext';

export default {
  title: 'Presets/Sortable/Multiple Containers',
};

type Items = Record<string, string[]>;

interface Props {
  children: any;
  adjustScale?: boolean;
  cancelDrop?: CancelDrop;
  columns?: number;
  containerStyle?: React.CSSProperties;
  multipleContainerStyle?: React.CSSProperties;
  addColumnStyle?: React.CSSProperties;
  coordinateGetter?: KeyboardCoordinateGetter;
  getItemStyles?(args: {
    value: UniqueIdentifier;
    index: number;
    overIndex: number;
    isDragging: boolean;
    containerId: UniqueIdentifier;
    isSorting: boolean;
    isDragOverlay: boolean;
  }): React.CSSProperties;
  wrapperStyle?(args: {index: number}): React.CSSProperties;
  itemCount?: number;
  handle?: boolean;
  renderItem?: any;
  strategy?: SortingStrategy;
  modifiers?: Modifiers;
  minimal?: boolean;
  trashable?: boolean;
  scrollable?: boolean;
  vertical?: boolean;
  showAddContainer?: boolean;
}

export const TRASH_ID = 'void';
const PLACEHOLDER_ID = 'placeholder';

export function MultipleContainersContext({
  cancelDrop,
  coordinateGetter = multipleContainersCoordinateGetter,
  modifiers,
  children,
}: Props) {
  const {
    activeId,
    setState,
    setActiveId,
    setContainers,
    setContainerIds,
    state,
  } = usePanelsContext();
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const recentlyMovedToNewContainer = useRef(false);
  const allContainers = state.containers;

  /**
   * Custom collision detection strategy optimized for multiple containers
   *
   * - First, find any droppable containers intersecting with the pointer.
   * - If there are none, find intersecting containers with the active draggable.
   * - If there are no intersecting containers, return the last matched intersection
   *
   */
  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      console.log('intersection');
      if (activeId && activeId in allContainers) {
        console.log('FIX THIS');
        return closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter(
            (container) => container.id in allContainers
          ),
        });
      }

      // Start by finding any intersecting droppable
      const pointerIntersections = pointerWithin(args);
      const intersections =
        pointerIntersections.length > 0
          ? // If there are droppables intersecting with the pointer, return those
            pointerIntersections
          : rectIntersection(args);
      let overId = getFirstCollision(intersections, 'id');

      if (overId != null) {
        if (overId === TRASH_ID) {
          // If the intersecting droppable is the trash, return early
          // Remove this if you're not using trashable functionality in your app
          return intersections;
        }

        if (overId in allContainers) {
          const containerItems = allContainers[overId];

          // If a container is matched and it contains items (columns 'A', 'B', 'C')
          if (containerItems.length > 0) {
            // Return the closest droppable within that container
            overId = closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter(
                (container) =>
                  container.id !== overId &&
                  containerItems.includes(container.id)
              ),
            })[0]?.id;
          }
        }

        lastOverId.current = overId;

        return [{id: overId}];
      }

      // When a draggable item moves to a new container, the layout may shift
      // and the `overId` may become `null`. We manually set the cached `lastOverId`
      // to the id of the draggable item that was moved to the new container, otherwise
      // the previous `overId` will be returned which can cause items to incorrectly shift positions
      if (recentlyMovedToNewContainer.current) {
        lastOverId.current = activeId as string;
      }

      // If no droppable is matched, return the last match
      return lastOverId.current ? [{id: lastOverId.current}] : [];
    },
    [activeId, allContainers]
  );
  const [clonedState, setClonedState] = useState<PanelContextState | null>(
    null
  );
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter,
    })
  );

  const onDragCancel = () => {
    if (clonedState) {
      // Reset items to their original state in case items have been
      // Dragged across containers
      setState(clonedState!);
    }

    setActiveId(null);
    setClonedState(null);
  };

  useEffect(() => {
    requestAnimationFrame(() => {
      recentlyMovedToNewContainer.current = false;
    });
  }, [allContainers]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      }}
      onDragStart={({active}) => {
        setActiveId(active.id);
        setClonedState(state);
      }}
      onDragOver={({active, over}) => {
        const overId = over?.id;
        const panelId =
          over?.data?.current?.panelId ?? active?.data?.current?.panelId;

        if (!overId || overId === TRASH_ID || active.id in allContainers) {
          return;
        }

        const overContainer = findContainer(overId, state);
        const activeContainer = findContainer(active.id, state);

        if (!overContainer || !activeContainer || !panelId) {
          console.warn(
            'Something missing on drag over',
            overContainer,
            activeContainer,
            panelId
          );
          return;
        }

        if (activeContainer !== overContainer) {
          setContainers(panelId, (containers) => {
            const activeItems = containers[activeContainer];
            const overItems = containers[overContainer];
            const overIndex = overItems.indexOf(overId);
            const activeIndex = activeItems.indexOf(active.id);

            let newIndex: number;

            if (overId in containers) {
              newIndex = overItems.length + 1;
            } else {
              const isBelowOverItem =
                over &&
                active.rect.current.translated &&
                active.rect.current.translated.top >
                  over.rect.top + over.rect.height;

              const modifier = isBelowOverItem ? 1 : 0;

              newIndex =
                overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
            }

            recentlyMovedToNewContainer.current = true;

            return {
              ...containers,
              [activeContainer]: containers[activeContainer].filter(
                (item) => item !== active.id
              ),
              [overContainer]: [
                ...containers[overContainer].slice(0, newIndex),
                containers[activeContainer][activeIndex],
                ...containers[overContainer].slice(
                  newIndex,
                  containers[overContainer].length
                ),
              ],
            };
          });
        }
      }}
      onDragEnd={({active, over}) => {
        const overPanelId = over?.data?.current?.panelId;
        if (active.id in allContainers && over?.id) {
          setContainerIds(overPanelId, (containers) => {
            const activeIndex = containers.indexOf(active.id);
            const overIndex = containers.indexOf(over.id);

            return arrayMove(containers, activeIndex, overIndex);
          });
        }

        const activeContainer = findContainer(active.id, state);

        if (!activeContainer) {
          setActiveId(null);
          return;
        }

        const overId = over?.id;

        if (!overId) {
          setActiveId(null);
          return;
        }

        if (overId === TRASH_ID) {
          setContainers(overPanelId, (items) => ({
            ...items,
            [activeContainer]: items[activeContainer].filter(
              (id) => id !== activeId
            ),
          }));
          setActiveId(null);
          return;
        }

        if (overId === PLACEHOLDER_ID) {
          const newContainerId = getNextContainerId();

          unstable_batchedUpdates(() => {
            setContainerIds(overPanelId, (containers) => [
              ...containers,
              newContainerId,
            ]);
            setContainers(overPanelId, (items) => ({
              ...items,
              [activeContainer]: items[activeContainer].filter(
                (id) => id !== activeId
              ),
              [newContainerId]: [active.id],
            }));
            setActiveId(null);
          });
          return;
        }

        const overContainer = findContainer(overId, state);

        if (overContainer) {
          const activeIndex = allContainers[activeContainer].indexOf(active.id);
          const overIndex = allContainers[overContainer].indexOf(overId);

          if (activeIndex !== overIndex) {
            setContainers(overPanelId, (items) => ({
              ...items,
              [overContainer]: arrayMove(
                items[overContainer],
                activeIndex,
                overIndex
              ),
            }));
          }
        }

        setActiveId(null);
      }}
      cancelDrop={cancelDrop}
      onDragCancel={onDragCancel}
      modifiers={modifiers}
    >
      {children}
    </DndContext>
  );

  function getNextContainerId() {
    const containerIds = Object.keys(allContainers);
    const lastContainerId = containerIds[containerIds.length - 1];

    return String.fromCharCode(lastContainerId.charCodeAt(0) + 1);
  }
}
