import { Typography, TypographyProps } from '../Typography';

import { useCard } from './CardContext';

export type CardTitleProps = TypographyProps;

export const CardTitle = (props: CardTitleProps) => {
  const { id } = useCard();

  return <Typography variant="pi" id={`${id}-title`} textColor="neutral800" fontWeight="bold" as="div" {...props} />;
};

export type CardSubtitleProps = Omit<TypographyProps, 'textColor' | 'as'>;

export const CardSubtitle = (props: CardSubtitleProps) => {
  return <Typography variant="pi" {...props} textColor="neutral600" as="div" />;
};
