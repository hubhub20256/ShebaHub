import { useState, useEffect } from 'react';

const useMediaQuery = (query) => {
  // 1. Initialize with the REAL value immediately, not just 'false'
  const [matches, setMatches] = useState(() => {
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const media = window.matchMedia(query);
    
    // 2. We no longer need the immediate 'if' check here because
    // the initial state is already correct!

    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);
    
    return () => media.removeEventListener("change", listener);
  }, [query]); // Removed 'matches' from dependency array

  return matches;
};

export default useMediaQuery;