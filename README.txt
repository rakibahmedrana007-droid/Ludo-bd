Ludo BD - Refresh Page Fix

This demo stores the currently selected page in localStorage and the URL hash.
So refreshing while on Deposit or Withdraw restores that same page instead of Home.

For your existing project, copy the same state-persistence approach into the
actual navigation/router code rather than replacing your existing UI.
