import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import Bullet from '@strapi/icons/Bullet';
import { Box } from '../Box';
import { Text } from '../Text';
import { Row } from '../Row';

const SubNavLinkWrapper = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-decoration: none;
  color: ${({ theme }) => theme.colors.neutral800};
  ${({ active, theme }) => {
    if (active) {
      return `
      background-color: ${theme.colors.primary100};
      border-right: 2px solid ${theme.colors.primary600};
      svg > * {
        fill: ${theme.colors.primary700};
      }
      ${Text} {
        color: ${theme.colors.primary700};
      }
      `;
    }
  }}
  &:focus-visible {
    outline-offset: -2px;
  }
`;
const CustomBullet = styled(Bullet)`
  width: ${12 / 16}rem;
  height: ${4 / 16}rem;
`;
const IconWrapper = styled.div`
  svg {
    height: ${12 / 16}rem;
    width: ${12 / 16}rem;
  }
`;

export const SubNavLink = ({ children, icon, withBullet, as, active, ...props }) => {
  return (
    <li>
      <SubNavLinkWrapper
        as={as}
        icon={icon}
        background="neutral100"
        paddingLeft={8}
        paddingBottom={2}
        paddingTop={2}
        active={active}
        aria-current={active}
        {...props}
      >
        <Row>
          {icon ? <IconWrapper>{icon}</IconWrapper> : <CustomBullet />}
          <Box paddingLeft={3}>
            <Text>{children}</Text>
          </Box>
        </Row>
        {withBullet && (
          <Box as={Row} paddingRight={4}>
            <CustomBullet />
          </Box>
        )}
      </SubNavLinkWrapper>
    </li>
  );
};

SubNavLink.defaultProps = {
  active: false,
  as: 'a',
  icon: null,
  withBullet: false,
};
SubNavLink.propTypes = {
  active: PropTypes.bool,
  as: PropTypes.oneOfType([PropTypes.elementType, PropTypes.string]),
  children: PropTypes.node,
  icon: PropTypes.element,
  link: PropTypes.element,
  withBullet: PropTypes.bool,
};
