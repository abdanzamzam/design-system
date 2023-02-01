import * as React from 'react';
import { useCallbackRef } from '@radix-ui/react-use-callback-ref';

/* -------------------------------------------------------------------------------------------------
 * This is taken from @radix-ui/react-select
 * -----------------------------------------------------------------------------------------------*/

export const useTypeaheadSearch = (onSearchChange: (search: string) => void) => {
  const handleSearchChange = useCallbackRef(onSearchChange);
  const searchRef = React.useRef('');
  const timerRef = React.useRef(0);

  const handleTypeaheadSearch = React.useCallback(
    (key: string) => {
      const search = searchRef.current + key;
      handleSearchChange(search);

      (function updateSearch(value: string) {
        searchRef.current = value;
        window.clearTimeout(timerRef.current);
        // Reset `searchRef` 1 second after it was last updated
        if (value !== '') timerRef.current = window.setTimeout(() => updateSearch(''), 1000);
      })(search);
    },
    [handleSearchChange],
  );

  const resetTypeahead = React.useCallback(() => {
    searchRef.current = '';
    window.clearTimeout(timerRef.current);
  }, []);

  React.useEffect(() => {
    return () => window.clearTimeout(timerRef.current);
  }, []);

  return [searchRef, handleTypeaheadSearch, resetTypeahead] as const;
};
