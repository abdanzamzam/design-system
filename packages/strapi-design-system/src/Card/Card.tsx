import { Box, BoxProps } from '../Box';

import { useId } from '../helpers/useId';

import { CardContext } from './CardContext';

export interface CardProps extends BoxProps {
  id?: string;
}

export const Card = ({ id, ...props }: CardProps) => {
  const generatedId = useId(id);

  return (
    <CardContext.Provider value={{ id: generatedId }}>
      <Box
        id={id}
        tabIndex={0}
        hasRadius
        background="neutral0"
        borderStyle="solid"
        borderWidth="1px"
        borderColor="neutral150"
        shadow="tableShadow"
        as="article"
        aria-labelledby={`${generatedId}-title`}
        {...props}
      />
    </CardContext.Provider>
  );
};
