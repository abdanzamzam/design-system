import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import Search from '@strapi/icons/Search';
import CloseAlertIcon from '@strapi/icons/CloseAlertIcon';
import SearchIcon from '@strapi/icons/SearchIcon';
import { Row } from '../Row';
import { H2 } from '../Text';
import { IconButton } from '../IconButton';
import { Box } from '../Box';
import { FieldInput, FieldAction } from '../Field';
import { Divider } from '../Divider';
import { useId } from '../helpers/useId';
import { usePrevious } from '../helpers/usePrevious';
import { KeyboardKeys } from '../helpers/keyboardKeys';

const Searchbar = styled(FieldInput)`
  height: ${32 / 16}rem;
`;
const CloseIconWrapper = styled(Row)`
  font-size: 0.5rem;
  svg path {
    fill: ${({ theme }) => theme.colors.neutral400};
  }
`;
const SearchIconWrapper = styled(Row)`
  font-size: 0.8rem;
  svg path {
    fill: ${({ theme, focused }) => (focused ? theme.colors.primary600 : theme.colors.neutral800)};
  }
`;
const CustomDivider = styled(Divider)`
  width: ${24 / 16}rem;
`;

export const SubNavHeader = ({ label, searchLabel, searchable, onChange, value, onClear }) => {
  const [isSearchOpen, setSearchOpen] = useState(false);
  const previousSearchOpenValue = usePrevious(isSearchOpen);
  const clearButonId = useId('subnav-searchbar-clear');
  const searchRef = useRef();
  const searchButtonRef = useRef();
  const isCompleting = value.length > 0;

  useEffect(() => {
    if (isSearchOpen && searchRef.current) {
      searchRef.current.focus();
    }
    if (previousSearchOpenValue && !isSearchOpen && searchButtonRef.current) {
      searchButtonRef.current.focus();
    }
  }, [isSearchOpen]);

  const toggleSearch = (e) => {
    setSearchOpen((isOpen) => !isOpen);
  };

  const handleClear = (e) => {
    onClear(e);
    searchRef.current.focus();
  };

  const handleBlur = (e) => {
    if (e.relatedTarget?.id !== clearButonId) {
      setSearchOpen(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === KeyboardKeys.ESCAPE) {
      setSearchOpen(false);
    }
  };

  if (isSearchOpen) {
    return (
      <Box paddingLeft={4} paddingTop={5} paddingBottom={2} paddingRight={4}>
        <Searchbar
          onKeyDown={handleKeyDown}
          ref={searchRef}
          onBlur={handleBlur}
          value={value}
          onChange={onChange}
          startAction={
            <SearchIconWrapper focused={isSearchOpen}>
              <SearchIcon aria-hidden={true} />
            </SearchIconWrapper>
          }
          endAction={
            isCompleting ? (
              <FieldAction id={clearButonId} label="Clear label" onClick={handleClear}>
                <CloseIconWrapper>
                  <CloseAlertIcon />
                </CloseIconWrapper>
              </FieldAction>
            ) : undefined
          }
        />
        <Box paddingLeft={2} paddingTop={4}>
          <CustomDivider />
        </Box>
      </Box>
    );
  }

  return (
    <Box paddingLeft={6} paddingTop={6} paddingBottom={2} paddingRight={4}>
      <Row justifyContent="space-between">
        <H2>{label}</H2>
        {searchable && (
          <IconButton ref={searchButtonRef} onClick={toggleSearch} label={searchLabel} icon={<Search />} />
        )}
      </Row>
      <Box paddingTop={4}>
        <CustomDivider />
      </Box>
    </Box>
  );
};

SubNavHeader.defaultProps = {
  searchable: false,
  onChange: () => {},
  onClear: () => {},
  value: '',
  searchLabel: '',
};

SubNavHeader.propTypes = {
  label: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  onClear: PropTypes.func,
  searchLabel: PropTypes.string,
  searchable: PropTypes.bool,
  value: PropTypes.string,
};
