import {CSS, useEvent, getWindow} from '@dnd-kit/utilities';
import type {DeepRequired, Transform} from '@dnd-kit/utilities';

import type {DraggableNodes} from '../../../store';
import type {ClientRect} from '../../../types';
import {getMeasurableNode} from '../../../utilities/nodes';
import {scrollIntoViewIfNeeded} from '../../../utilities/scroll';
import {parseTransform} from '../../../utilities/transform';
import type {MeasuringConfiguration} from '../../DndContext';
import type {Animation} from '../components';

export interface DropAnimationOptions {
  duration: number;
  easing: string;
  dragSourceOpacity?: number;
}

export type DropAnimation = DropAnimationFunction | DropAnimationOptions;

interface Arguments {
  draggableNodes: DraggableNodes;
  measuringConfiguration: DeepRequired<MeasuringConfiguration>;
  config?: DropAnimation | null;
}

interface CustomDropAnimationArguments {
  active: {
    node: HTMLElement;
    rect: ClientRect;
  };
  dragOverlay: {
    node: HTMLElement;
    rect: ClientRect;
  };
  transform: Transform;
}

type DropAnimationFunction = (
  args: CustomDropAnimationArguments
) => ReturnType<Animation>;

export const defaultDropAnimationConfiguration: DropAnimationOptions = {
  duration: 250,
  easing: 'ease',
  dragSourceOpacity: 0,
};

export function useDropAnimation({
  config = defaultDropAnimationConfiguration,
  measuringConfiguration,
  draggableNodes,
}: Arguments) {
  return useEvent<Animation>((id, node) => {
    if (config == null) {
      return;
    }

    const activeNode = draggableNodes[id]?.node.current;

    if (!activeNode) {
      return;
    }

    const measurableNode = getMeasurableNode(node);

    if (!measurableNode) {
      return;
    }
    const {transform} = getWindow(node).getComputedStyle(node);
    const parsedTransform = parseTransform(transform);

    if (!parsedTransform) {
      return;
    }

    const animation: DropAnimationFunction =
      typeof config === 'function'
        ? config
        : createDefaultDropAnimation(config);

    scrollIntoViewIfNeeded(
      activeNode,
      measuringConfiguration.draggable.measure
    );

    return animation({
      active: {
        node: activeNode,
        rect: measuringConfiguration.draggable.measure(activeNode),
      },
      dragOverlay: {
        node,
        rect: measuringConfiguration.dragOverlay.measure(measurableNode),
      },
      transform: parsedTransform,
    });
  });
}

function createDefaultDropAnimation(
  options: DropAnimationOptions
): DropAnimationFunction {
  return ({active, dragOverlay, transform}) => {
    const {duration, easing, dragSourceOpacity} = options;

    if (!duration) {
      // Do not animate if animation duration is zero.
      return;
    }

    const delta = {
      x: dragOverlay.rect.left - active.rect.left,
      y: dragOverlay.rect.top - active.rect.top,
    };

    if (!delta.x && !delta.y) {
      // Drag overlay is already positioned over active draggable node
      // no drop animation required, return early.
      return;
    }

    const scale = {
      scaleX:
        transform.scaleX !== 1
          ? (active.rect.width * transform.scaleX) / dragOverlay.rect.width
          : 1,
      scaleY:
        transform.scaleY !== 1
          ? (active.rect.height * transform.scaleY) / dragOverlay.rect.height
          : 1,
    };
    const finalTransform = CSS.Transform.toString({
      x: transform.x - delta.x,
      y: transform.y - delta.y,
      ...scale,
    });

    const originalOpacity = active.node.style.getPropertyValue('opacity');

    if (dragSourceOpacity != null) {
      active.node.style.setProperty('opacity', `${dragSourceOpacity}`);
    }

    const animation = dragOverlay.node.animate(
      [
        {
          transform: CSS.Transform.toString(transform),
        },
        {
          transform: finalTransform,
        },
      ],
      {
        easing,
        duration,
      }
    );

    return new Promise((resolve) => {
      animation.onfinish = () => {
        active.node.style.setProperty('opacity', originalOpacity);

        resolve();
      };
    });
  };
}
