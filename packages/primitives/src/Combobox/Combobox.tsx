import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { hideOthers } from 'aria-hidden';
import { RemoveScroll } from 'react-remove-scroll';

import { composeEventHandlers } from '@radix-ui/primitive';
import { createCollection } from '@radix-ui/react-collection';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { createContext } from '@radix-ui/react-context';
import { useDirection } from '@radix-ui/react-direction';
import { useId } from '@radix-ui/react-id';
import * as PopperPrimitive from '@radix-ui/react-popper';
import { Primitive } from '@radix-ui/react-primitive';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { Slot } from '@radix-ui/react-slot';
import { DismissableLayer } from '@radix-ui/react-dismissable-layer';
import { useFocusGuards } from '@radix-ui/react-focus-guards';
import { FocusScope } from '@radix-ui/react-focus-scope';
import { Portal as PortalPrimitive } from '@radix-ui/react-portal';

import type { Scope } from '@radix-ui/react-context';
import type { ComponentPropsWithoutRef, PrimitivePropsWithRef } from '@radix-ui/react-primitive';

import { useTypeaheadSearch } from '../hooks/useTypeaheadSearch';
import { findNextItem } from '../helpers/arrays';

type Direction = 'ltr' | 'rtl';

const OPEN_KEYS = [' ', 'Enter', 'ArrowUp', 'ArrowDown'];

/* -------------------------------------------------------------------------------------------------
 * Combobox
 * -----------------------------------------------------------------------------------------------*/

const COMBOBOX_NAME = 'Combobox';

type ItemData = { value: string; disabled: boolean; textValue: string };

/**
 * Collections are slots, they're used for composition as opposed to doing
 * `<CollectionItem as={Slot}>…</CollectionItem>` which encounters issues with
 * generic types that cannot be statically analysed
 */
const [Collection, useCollection] = createCollection<ComboboxItemElement, ItemData>(COMBOBOX_NAME);

type ComboboxContextValue = {
  contentId: string;
  dir: ComboboxProps['dir'];
  disabled?: boolean;
  onOpenChange(open: boolean): void;
  onTriggerChange(node: ComboboxTriggerElement | null): void;
  onValueChange(value: string): void;
  open: boolean;
  required?: boolean;
  trigger: ComboboxTriggerElement | null;
  triggerPointerDownPosRef: React.MutableRefObject<{ x: number; y: number } | null>;
  value?: string;
};

const [ComboboxProvider, useComboboxContext] = createContext<ComboboxContextValue>(COMBOBOX_NAME);

interface ComboboxProps {
  children?: React.ReactNode;
  defaultOpen?: boolean;
  defaultValue?: string;
  dir?: Direction;
  disabled?: boolean;
  onOpenChange?(open: boolean): void;
  onValueChange?(value: string): void;
  open?: boolean;
  required?: boolean;
  value?: string;
}

const Combobox: React.FC<ComboboxProps> = (props) => {
  const {
    children,
    open: openProp,
    defaultOpen,
    dir,
    onOpenChange,
    value: valueProp,
    defaultValue,
    onValueChange,
    disabled,
    required,
  } = props;

  const [trigger, setTrigger] = React.useState<ComboboxTriggerElement | null>(null);
  const direction = useDirection(dir);
  const triggerPointerDownPosRef = React.useRef<{ x: number; y: number } | null>(null);

  /**
   * Lets state either be handled externally or internally.
   */
  const [open = false, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  });
  const [value, setValue] = useControllableState({
    prop: valueProp,
    defaultProp: defaultValue,
    onChange: onValueChange,
  });

  const id = useId();

  return (
    <PopperPrimitive.Root>
      <ComboboxProvider
        required={required}
        trigger={trigger}
        onTriggerChange={setTrigger}
        // valueNode={valueNode}
        // onValueNodeChange={setValueNode}
        // valueNodeHasChildren={valueNodeHasChildren}
        // onValueNodeHasChildrenChange={setValueNodeHasChildren}
        contentId={id}
        value={value}
        onValueChange={setValue}
        open={open}
        onOpenChange={setOpen}
        dir={direction}
        triggerPointerDownPosRef={triggerPointerDownPosRef}
        disabled={disabled}
      >
        <Collection.Provider scope={undefined}>{children}</Collection.Provider>
      </ComboboxProvider>
    </PopperPrimitive.Root>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ComboboxTrigger
 * -----------------------------------------------------------------------------------------------*/

const TRIGGER_NAME = 'ComboboxTrigger';

type ComboboxTriggerElement = React.ElementRef<'div'>;
type ComboboxTriggerProps = PrimitiveDivProps;

/**
 * TODO: Currently this holds the input and you can't really ad the button next to it...
 * Maybe the input should be it's own component? The next issue is how do you deal with
 * changing the inner value of the input without changing the _actual_ value of the combobox...
 *
 * CHALLENGES.
 */

const ComboboxTrigger = React.forwardRef<ComboboxTriggerElement, ComboboxTriggerProps>((props, forwardedRef) => {
  const { ...triggerProps } = props;

  return (
    <PopperPrimitive.Anchor asChild>
      <Primitive.div ref={forwardedRef} {...triggerProps} />
    </PopperPrimitive.Anchor>
  );
});

/* -------------------------------------------------------------------------------------------------
 * ComboboxInput
 * -----------------------------------------------------------------------------------------------*/

const INPUT_NAME = 'ComboboxInput';

const InputPrimitive = React.forwardRef((props: PrimitivePropsWithRef<'input'>, forwardedRef: any) => {
  const { asChild, ...primitiveProps } = props;
  const Comp: any = asChild ? Slot : 'input';

  React.useEffect(() => {
    (window as any)[Symbol.for('radix-ui')] = true;
  }, []);

  return <Comp {...primitiveProps} ref={forwardedRef} />;
});

InputPrimitive.displayName = `Primitive.input`;

type PrimitiveInputProps = Omit<ComponentPropsWithoutRef<'input'>, 'children' | 'disabled'>;

interface ComboboxInputProps extends PrimitiveInputProps {}

const ComboxboxInput = React.forwardRef((props: ComboboxInputProps, forwardedRef) => {
  const { ...inputProps } = props;

  const context = useComboboxContext(INPUT_NAME);

  const isDisabled = context.disabled;
  const composedRefs = useComposedRefs(forwardedRef, context.onTriggerChange);
  const getItems = useCollection(undefined);

  const [searchRef, handleTypeaheadSearch, resetTypeahead] = useTypeaheadSearch((search) => {
    const enabledItems = getItems().filter((item) => !item.disabled);
    const currentItem = enabledItems.find((item) => item.value === context.value);
    const nextItem = findNextItem(enabledItems, search, currentItem);
    if (nextItem !== undefined) {
      context.onValueChange(nextItem.value);
    }
  });

  const handleOpen = () => {
    if (!isDisabled) {
      context.onOpenChange(true);
      // reset typeahead when we open
      resetTypeahead();
    }
  };

  React.useEffect(() => {
    /**
     * The combobox can be open by either the input
     * or the icon, if it's changed by an external source
     * we want to make sure we reset the typeahead on
     * the cleanup of opening.
     */

    return () => {
      if (!context.open) {
        resetTypeahead();
      }
    };
  }, [context.open]);

  return (
    <InputPrimitive
      type="text"
      role="combobox"
      aria-controls={context.contentId}
      aria-expanded={context.open}
      aria-required={context.required}
      aria-autocomplete="both"
      dir={context.dir}
      data-state={context.open ? 'open' : 'closed'}
      disabled={isDisabled}
      data-disabled={isDisabled ? '' : undefined}
      data-placeholder={context.value === undefined ? '' : undefined}
      {...inputProps}
      ref={composedRefs}
      // Enable compatibility with native label or custom `Label` "click" for Safari:
      onClick={composeEventHandlers(inputProps.onClick, (event) => {
        // Whilst browsers generally have no issue focusing the trigger when clicking
        // on a label, Safari seems to struggle with the fact that there's no `onClick`.
        // We force `focus` in this case. Note: this doesn't create any other side-effect
        // because we are preventing default in `onPointerDown` so effectively
        // this only runs for a label "click"
        event.currentTarget.focus();
      })}
      onPointerDown={composeEventHandlers(inputProps.onPointerDown, (event) => {
        // prevent implicit pointer capture
        // https://www.w3.org/TR/pointerevents3/#implicit-pointer-capture
        const target = event.target as HTMLElement;
        if (target.hasPointerCapture(event.pointerId)) {
          target.releasePointerCapture(event.pointerId);
        }

        // only call handler if it's the left button (mousedown gets triggered by all mouse buttons)
        // but not when the control key is pressed (avoiding MacOS right click)
        if (event.button === 0 && event.ctrlKey === false) {
          handleOpen();
          context.triggerPointerDownPosRef.current = {
            x: Math.round(event.pageX),
            y: Math.round(event.pageY),
          };
          // prevent trigger from stealing focus from the active item after opening.
          event.preventDefault();
        }
      })}
      onKeyDown={composeEventHandlers(inputProps.onKeyDown, (event) => {
        const isTypingAhead = searchRef.current !== '';
        const isModifierKey = event.ctrlKey || event.altKey || event.metaKey;
        if (!isModifierKey && event.key.length === 1) handleTypeaheadSearch(event.key);
        if (isTypingAhead && event.key === ' ') return;
        if (OPEN_KEYS.includes(event.key)) {
          handleOpen();
          event.preventDefault();
        }
      })}
    />
  );
});

/* -------------------------------------------------------------------------------------------------
 * ComboboxPortal
 * -----------------------------------------------------------------------------------------------*/

const PORTAL_NAME = 'ComboboxPortal';

type PortalProps = React.ComponentPropsWithoutRef<typeof PortalPrimitive>;
interface ComboboxPortalProps extends Omit<PortalProps, 'asChild'> {
  children?: React.ReactNode;
}

const ComboboxPortal: React.FC<ComboboxPortalProps> = (props: ComboboxPortalProps) => {
  return <PortalPrimitive asChild {...props} />;
};

ComboboxPortal.displayName = PORTAL_NAME;

/* -------------------------------------------------------------------------------------------------
 * ComboboxContent
 * -----------------------------------------------------------------------------------------------*/

const CONTENT_NAME = 'ComboboxContent';

type ComboboxContentElement = ComboboxContentImplElement;
type ComboboxContentProps = ComboboxContentImplProps;

const ComboboxContent = React.forwardRef<ComboboxContentElement, ComboboxContentProps>((props, forwardedRef) => {
  const context = useComboboxContext(CONTENT_NAME);
  const [fragment, setFragment] = React.useState<DocumentFragment>();

  // setting the fragment in `useLayoutEffect` as `DocumentFragment` doesn't exist on the server
  React.useLayoutEffect(() => {
    setFragment(new DocumentFragment());
  }, []);

  if (!context.open) {
    const frag = fragment as Element | undefined;
    return frag
      ? ReactDOM.createPortal(
          <ComboboxContentProvider>
            <Collection.Slot scope={undefined}>
              <div>{props.children}</div>
            </Collection.Slot>
          </ComboboxContentProvider>,
          frag,
        )
      : null;
  }

  return <ComboboxContentImpl {...props} ref={forwardedRef} />;
});

/* -------------------------------------------------------------------------------------------------
 * ComboboxContentImpl
 * -----------------------------------------------------------------------------------------------*/

const CONTENT_MARGIN = 10;

type ComboboxContentContextValue = {
  content?: ComboboxContentElement | null;
  viewport?: ComboboxViewportElement | null;
  onViewportChange?: (node: ComboboxViewportElement | null) => void;
  itemRefCallback?: (node: ComboboxItemElement | null, value: string, disabled: boolean) => void;
  ComboboxedItem?: ComboboxItemElement | null;
  onItemLeave?: () => void;
  position?: ComboboxContentProps['position'];
  isPositioned?: boolean;
  searchRef?: React.RefObject<string>;
};

const [ComboboxContentProvider, useComboboxContentContext] = createContext<ComboboxContentContextValue>(CONTENT_NAME);

const CONTENT_IMPL_NAME = 'ComboboxContentImpl';

type ComboboxContentImplElement = ComboboxPopperPositionElement;
type DismissableLayerProps = React.ComponentPropsWithoutRef<typeof DismissableLayer>;
type FocusScopeProps = ComponentPropsWithoutRef<typeof FocusScope>;

type ComboboxPopperPrivateProps = { onPlaced?: PopperContentProps['onPlaced'] };

interface ComboboxContentImplProps extends Omit<ComboboxPopperPositionProps, keyof ComboboxPopperPrivateProps> {
  /**
   * Event handler called when auto-focusing on close.
   * Can be prevented.
   */
  onCloseAutoFocus?: FocusScopeProps['onUnmountAutoFocus'];
  /**
   * Event handler called when the escape key is down.
   * Can be prevented.
   */
  onEscapeKeyDown?: DismissableLayerProps['onEscapeKeyDown'];
  /**
   * Event handler called when the a `pointerdown` event happens outside of the `DismissableLayer`.
   * Can be prevented.
   */
  onPointerDownOutside?: DismissableLayerProps['onPointerDownOutside'];

  position?: 'item-aligned' | 'popper';
}

const ComboboxContentImpl = React.forwardRef<ComboboxContentImplElement, ComboboxContentImplProps>(
  (props, forwardedRef) => {
    const {
      position = 'item-aligned',
      onCloseAutoFocus,
      onEscapeKeyDown,
      onPointerDownOutside,
      //
      // PopperContent props
      side,
      sideOffset,
      align,
      alignOffset,
      arrowPadding,
      collisionBoundary,
      collisionPadding,
      sticky,
      hideWhenDetached,
      avoidCollisions,
      //
      ...contentProps
    } = props;
    const context = useComboboxContext(CONTENT_NAME);
    const [content, setContent] = React.useState<ComboboxContentImplElement | null>(null);
    const [viewport, setViewport] = React.useState<ComboboxViewportElement | null>(null);
    const composedRefs = useComposedRefs(forwardedRef, (node) => setContent(node));
    const [ComboboxedItem, setComboboxedItem] = React.useState<ComboboxItemElement | null>(null);
    const getItems = useCollection(undefined);
    const [isPositioned, setIsPositioned] = React.useState(false);
    const firstValidItemFoundRef = React.useRef(false);

    // aria-hide everything except the content (better supported equivalent to setting aria-modal)
    React.useEffect(() => {
      // if (content) return hideOthers(content);
    }, [content]);

    // Make sure the whole tree has focus guards as our `Combobox` may be
    // the last element in the DOM (because of the `Portal`)
    useFocusGuards();

    // prevent Comboboxing items on `pointerup` in some cases after opening from `pointerdown`
    // and close on `pointerup` outside.
    const { onOpenChange, triggerPointerDownPosRef } = context;
    React.useEffect(() => {
      if (content) {
        let pointerMoveDelta = { x: 0, y: 0 };

        const handlePointerMove = (event: PointerEvent) => {
          pointerMoveDelta = {
            x: Math.abs(Math.round(event.pageX) - (triggerPointerDownPosRef.current?.x ?? 0)),
            y: Math.abs(Math.round(event.pageY) - (triggerPointerDownPosRef.current?.y ?? 0)),
          };
        };
        const handlePointerUp = (event: PointerEvent) => {
          // If the pointer hasn't moved by a certain threshold then we prevent Comboboxing item on `pointerup`.
          if (pointerMoveDelta.x <= 10 && pointerMoveDelta.y <= 10) {
            event.preventDefault();
          } else {
            // otherwise, if the event was outside the content, close.
            if (!content.contains(event.target as HTMLElement)) {
              onOpenChange(false);
            }
          }
          document.removeEventListener('pointermove', handlePointerMove);
          triggerPointerDownPosRef.current = null;
        };

        if (triggerPointerDownPosRef.current !== null) {
          document.addEventListener('pointermove', handlePointerMove);
          document.addEventListener('pointerup', handlePointerUp, { capture: true, once: true });
        }

        return () => {
          document.removeEventListener('pointermove', handlePointerMove);
          document.removeEventListener('pointerup', handlePointerUp, { capture: true });
        };
      }
    }, [content, onOpenChange, triggerPointerDownPosRef]);

    React.useEffect(() => {
      const close = () => onOpenChange(false);
      window.addEventListener('blur', close);
      window.addEventListener('resize', close);
      return () => {
        window.removeEventListener('blur', close);
        window.removeEventListener('resize', close);
      };
    }, [onOpenChange]);

    const [searchRef, handleTypeaheadSearch] = useTypeaheadSearch((search) => {
      const enabledItems = getItems().filter((item) => !item.disabled);
      const currentItem = enabledItems.find((item) => item.ref.current === document.activeElement);
      const nextItem = findNextItem(enabledItems, search, currentItem);
      if (nextItem) {
        /**
         * Imperative focus during keydown is risky so we prevent React's batching updates
         * to avoid potential bugs. See: https://github.com/facebook/react/issues/20332
         */
        setTimeout(() => (nextItem.ref.current as HTMLElement).focus());
      }
    });

    const itemRefCallback = React.useCallback(
      (node: ComboboxItemElement | null, value: string, disabled: boolean) => {
        const isFirstValidItem = !firstValidItemFoundRef.current && !disabled;
        const isComboboxedItem = context.value !== undefined && context.value === value;
        if (isComboboxedItem || isFirstValidItem) {
          setComboboxedItem(node);
          if (isFirstValidItem) firstValidItemFoundRef.current = true;
        }
      },
      [context.value],
    );
    const handleItemLeave = React.useCallback(() => content?.focus(), [content]);

    // Silently ignore props that are not supported by `ComboboxItemAlignedPosition`
    const popperContentProps = {
      side,
      sideOffset,
      align,
      alignOffset,
      arrowPadding,
      collisionBoundary,
      collisionPadding,
      sticky,
      hideWhenDetached,
      avoidCollisions,
    };

    return (
      <ComboboxContentProvider
        content={content}
        viewport={viewport}
        onViewportChange={setViewport}
        itemRefCallback={itemRefCallback}
        ComboboxedItem={ComboboxedItem}
        onItemLeave={handleItemLeave}
        position={position}
        isPositioned={isPositioned}
        searchRef={searchRef}
      >
        {/* <RemoveScroll as={Slot} allowPinchZoom>
          <FocusScope
            asChild
            // we make sure we're not trapping once it's been closed
            // (closed !== unmounted when animating out)
            trapped={context.open}
            onMountAutoFocus={(event) => {
              // we prevent open autofocus because we manually focus the Comboboxed item
              event.preventDefault();
            }}
            onUnmountAutoFocus={composeEventHandlers(onCloseAutoFocus, (event) => {
              context.trigger?.focus({ preventScroll: true });
              event.preventDefault();
            })}
          > */}
        <DismissableLayer
          asChild
          disableOutsidePointerEvents
          onEscapeKeyDown={onEscapeKeyDown}
          onPointerDownOutside={onPointerDownOutside}
          // When focus is trapped, a focusout event may still happen.
          // We make sure we don't trigger our `onDismiss` in such case.
          onFocusOutside={(event) => event.preventDefault()}
          onDismiss={() => context.onOpenChange(false)}
        >
          <ComboboxPopperPosition
            role="listbox"
            id={context.contentId}
            data-state={context.open ? 'open' : 'closed'}
            dir={context.dir}
            onContextMenu={(event) => event.preventDefault()}
            {...contentProps}
            {...popperContentProps}
            onPlaced={() => setIsPositioned(true)}
            ref={composedRefs}
            style={{
              // flex layout so we can place the scroll buttons properly
              display: 'flex',
              flexDirection: 'column',
              // reset the outline by default as the content MAY get focused
              outline: 'none',
              ...contentProps.style,
            }}
            onKeyDown={composeEventHandlers(contentProps.onKeyDown, (event) => {
              const isModifierKey = event.ctrlKey || event.altKey || event.metaKey;

              // Combobox should not be navigated using tab key so we prevent it
              if (event.key === 'Tab') event.preventDefault();

              if (!isModifierKey && event.key.length === 1) handleTypeaheadSearch(event.key);

              if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
                const items = getItems().filter((item) => !item.disabled);
                let candidateNodes = items.map((item) => item.ref.current!);

                if (['ArrowUp', 'End'].includes(event.key)) {
                  candidateNodes = candidateNodes.slice().reverse();
                }
                if (['ArrowUp', 'ArrowDown'].includes(event.key)) {
                  const currentElement = event.target as ComboboxItemElement;
                  const currentIndex = candidateNodes.indexOf(currentElement);
                  candidateNodes = candidateNodes.slice(currentIndex + 1);
                }

                /**
                 * Imperative focus during keydown is risky so we prevent React's batching updates
                 * to avoid potential bugs. See: https://github.com/facebook/react/issues/20332
                 */
                // setTimeout(() => focusFirst(candidateNodes));

                event.preventDefault();
              }
            })}
          />
        </DismissableLayer>
        {/* </FocusScope>
        </RemoveScroll> */}
      </ComboboxContentProvider>
    );
  },
);

/* -------------------------------------------------------------------------------------------------
 * ComboboxPopperPosition
 * -----------------------------------------------------------------------------------------------*/

type ComboboxPopperPositionElement = React.ElementRef<typeof PopperPrimitive.Content>;
type PopperContentProps = React.ComponentPropsWithoutRef<typeof PopperPrimitive.Content>;
interface ComboboxPopperPositionProps extends PopperContentProps, ComboboxPopperPrivateProps {}

const ComboboxPopperPosition = React.forwardRef<ComboboxPopperPositionElement, ComboboxPopperPositionProps>(
  (props, forwardedRef) => {
    const { align = 'start', collisionPadding = CONTENT_MARGIN, ...popperProps } = props;

    return (
      <PopperPrimitive.Content
        {...popperProps}
        ref={forwardedRef}
        align={align}
        collisionPadding={collisionPadding}
        style={{
          // Ensure border-box for floating-ui calculations
          boxSizing: 'border-box',
          ...popperProps.style,
          // re-namespace exposed content custom properties
          ...{
            '--radix-combobox-content-transform-origin': 'var(--radix-popper-transform-origin)',
            '--radix-combobox-content-available-width': 'var(--radix-popper-available-width)',
            '--radix-combobox-content-available-height': 'var(--radix-popper-available-height)',
            '--radix-combobox-trigger-width': 'var(--radix-popper-anchor-width)',
            '--radix-combobox-trigger-height': 'var(--radix-popper-anchor-height)',
          },
        }}
      />
    );
  },
);

/* -------------------------------------------------------------------------------------------------
 * ComboboxViewport
 * -----------------------------------------------------------------------------------------------*/

type ComboboxViewportElement = React.ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

/* -------------------------------------------------------------------------------------------------
 * ComboboxItem
 * -----------------------------------------------------------------------------------------------*/

type ComboboxItemElement = React.ElementRef<typeof Primitive.div>;

/* -------------------------------------------------------------------------------------------------
 * ComboboxIcon
 * -----------------------------------------------------------------------------------------------*/

type ComboboxIconElement = React.ElementRef<typeof Primitive.button>;
type PrimitiveButtonProps = ComponentPropsWithoutRef<typeof Primitive.button>;
interface ComboboxIconProps extends PrimitiveButtonProps {}

const ComboboxIcon = React.forwardRef<ComboboxIconElement, ComboboxIconProps>((props, forwardedRef) => {
  const { children, ...iconProps } = props;

  const context = useComboboxContext(INPUT_NAME);

  const isDisabled = context.disabled;

  const handleOpen = () => {
    if (!isDisabled) {
      context.onOpenChange(true);
      /**
       * We should be focussing the trigger here not this button.
       */
      context.trigger?.focus();
    }
  };

  return (
    <Primitive.button
      aria-hidden
      {...iconProps}
      tabIndex={-1}
      ref={forwardedRef} // Enable compatibility with native label or custom `Label` "click" for Safari:
      onClick={composeEventHandlers(iconProps.onClick, () => {
        // Whilst browsers generally have no issue focusing the trigger when clicking
        // on a label, Safari seems to struggle with the fact that there's no `onClick`.
        // We force `focus` in this case. Note: this doesn't create any other side-effect
        // because we are preventing default in `onPointerDown` so effectively
        // this only runs for a label "click"
        console.log(context.trigger);
        context.trigger?.focus();
      })}
      onPointerDown={composeEventHandlers(iconProps.onPointerDown, (event) => {
        // prevent implicit pointer capture
        // https://www.w3.org/TR/pointerevents3/#implicit-pointer-capture
        const target = event.target as HTMLElement;
        if (target.hasPointerCapture(event.pointerId)) {
          target.releasePointerCapture(event.pointerId);
        }

        // only call handler if it's the left button (mousedown gets triggered by all mouse buttons)
        // but not when the control key is pressed (avoiding MacOS right click)
        if (event.button === 0 && event.ctrlKey === false) {
          handleOpen();
          context.triggerPointerDownPosRef.current = {
            x: Math.round(event.pageX),
            y: Math.round(event.pageY),
          };
          // prevent trigger from stealing focus from the active item after opening.
          event.preventDefault();
        }
      })}
      onKeyDown={composeEventHandlers(iconProps.onKeyDown, (event) => {
        if (OPEN_KEYS.includes(event.key)) {
          handleOpen();
          event.preventDefault();
        }
      })}
    >
      {children || '▼'}
    </Primitive.button>
  );
});

const Root = Combobox;
const Trigger = ComboboxTrigger;
const Input = ComboxboxInput;
const Icon = ComboboxIcon;
const Portal = ComboboxPortal;
const Content = ComboboxContent;

export { Root, Trigger, Input, Icon, Portal, Content };

export type { ComboboxProps, ComboboxTriggerProps };
