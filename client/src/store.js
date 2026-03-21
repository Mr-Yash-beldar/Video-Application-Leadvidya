import React, { useReducer } from "react"

export const Store = React.createContext(); //eslint-disable-line
const initialState = {
  privateRoomCode: ""
}

const stateReducer = (state, action) => {
  switch (action.type) {
    case "SET_PRIVATE_ROOM_CODE":
      return { ...state, privateRoomCode: action.roomCode }
    default:
      return state
  }
}

export function StoreProvider(props) {
  const [state, dispatch] = useReducer(stateReducer, initialState)
  const value = { state, dispatch }
  return <Store.Provider value={value}>{props.children}</Store.Provider>
}