import * as React from 'react';

function createPrimitive<T extends keyof JSX.IntrinsicElements>(
  tag: T,
  displayName: string,
): React.ForwardRefExoticComponent<React.ComponentPropsWithoutRef<T> & React.RefAttributes<HTMLElement>> {
  const Component = React.forwardRef<HTMLElement, React.ComponentPropsWithoutRef<T>>(
    ({ children, ...props }, ref) => React.createElement(tag, { ref, ...props }, children),
  );
  Component.displayName = displayName;
  return Component;
}

const CheckboxItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { checked?: boolean }>(
  ({ children, checked, ...props }, ref) => (
    <div ref={ref} data-checked={checked === undefined ? undefined : String(checked)} {...props}>
      {children}
    </div>
  ),
);
CheckboxItem.displayName = 'CheckboxItem';

export const Item = createPrimitive('div', 'Item');
export const CheckboxItemPrimitive = CheckboxItem;
export const RadioItem = createPrimitive('div', 'RadioItem');
export const ItemIndicator = createPrimitive('span', 'ItemIndicator');
export const Label = createPrimitive('div', 'Label');
export const Separator = createPrimitive('div', 'Separator');
export const SubTrigger = createPrimitive('div', 'SubTrigger');
export const SubContent = createPrimitive('div', 'SubContent');
export const Content = createPrimitive('div', 'Content');
export const Portal = ({ children }: { children: React.ReactNode }): React.ReactElement => <>{children}</>;

export { CheckboxItemPrimitive as CheckboxItem };
