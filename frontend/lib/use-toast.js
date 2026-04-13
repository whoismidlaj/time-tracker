"use client";
import * as React from "react";

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 4000;

let count = 0;
function genId() { return ++count; }

const toastTimeouts = new Map();

const listeners = [];
let memoryState = { toasts: [] };

function dispatch(action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach(l => l(memoryState));
}

function reducer(state, action) {
  switch (action.type) {
    case "ADD_TOAST":
      return { ...state, toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT) };
    case "UPDATE_TOAST":
      return { ...state, toasts: state.toasts.map(t => t.id === action.toast.id ? { ...t, ...action.toast } : t) };
    case "DISMISS_TOAST": {
      const { toastId } = action;
      if (toastId) scheduleRemove(toastId);
      else state.toasts.forEach(t => scheduleRemove(t.id));
      return { ...state, toasts: state.toasts.map(t => (!toastId || t.id === toastId) ? { ...t, open: false } : t) };
    }
    case "REMOVE_TOAST":
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.toastId) };
    default:
      return state;
  }
}

function scheduleRemove(toastId) {
  if (toastTimeouts.has(toastId)) return;
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: "REMOVE_TOAST", toastId });
  }, TOAST_REMOVE_DELAY);
  toastTimeouts.set(toastId, timeout);
}

export function toast({ ...props }) {
  const id = genId();
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });
  dispatch({ type: "ADD_TOAST", toast: { ...props, id, open: true, onOpenChange: open => { if (!open) dismiss(); } } });
  setTimeout(() => dismiss(), TOAST_REMOVE_DELAY - 200);
  return { id, dismiss };
}

export function useToast() {
  const [state, setState] = React.useState(memoryState);
  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const i = listeners.indexOf(setState);
      if (i > -1) listeners.splice(i, 1);
    };
  }, []);
  return { ...state, toast, dismiss: id => dispatch({ type: "DISMISS_TOAST", toastId: id }) };
}
