import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';

const CardAssetImg = styled.img`
  // inline flows is based on typography and displays an extra white space below the image
  // switch to block is required in order to make the img stick the bottom of the container
  // addition infos: https://stackoverflow.com/questions/5804256/image-inside-div-has-extra-space-below-the-image
  margin: 0;
  padding: 0;
  height: 100%;
`;

const CardAssetSizes = {
  S: 88,
  M: 164,
};

const CardAssetWrapper = styled.div`
  display: flex;
  justify-content: center;
  height: ${({ size }) => CardAssetSizes[size] / 16}rem;
  width: 100%;
  background: repeating-conic-gradient(${({ theme }) => theme.colors.neutral100} 0% 25%, transparent 0% 50%) 50% / 20px
    20px;
`;

export const CardAsset = ({ size, ...props }) => {
  return (
    <CardAssetWrapper size={size}>
      <CardAssetImg {...props} aria-hidden />
    </CardAssetWrapper>
  );
};

CardAsset.defaultProps = {
  size: 'M',
};

CardAsset.propTypes = {
  size: PropTypes.oneOf(['S', 'M']),
};
