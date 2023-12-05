import { createContext, useContext, useReducer } from "react";

// prepares the data layer
export const StateContext = createContext();

// wraps our app and provide the data layer to all our components
export const StateProvider = ({ reducer, initialState, children }) => (
  <StateContext.Provider value={useReducer(reducer, initialState)}>
    {children}
  </StateContext.Provider>
);

// pull information from the data layer
export const useStateValue = () => useContext(StateContext);
