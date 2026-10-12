type FrameSubscriber = (time: number) => void;

const subscribers = new Map<number, FrameSubscriber>();
let nextId = 0;
let frame = 0;
let visibilityAttached = false;

function tick(time: number) {
  frame = 0;
  if (document.visibilityState !== "hidden") {
    subscribers.forEach((subscriber) => subscriber(time));
    if (subscribers.size) frame = requestAnimationFrame(tick);
  }
}

function resume() {
  if (document.visibilityState !== "hidden" && subscribers.size && !frame) frame = requestAnimationFrame(tick);
}

function onVisibilityChange() {
  if (document.visibilityState === "hidden") {
    cancelAnimationFrame(frame);
    frame = 0;
  } else {
    resume();
  }
}

/** Subscribe to the shared motion clock. It runs only while needed and while the tab is visible. */
export function subscribeMotionFrame(subscriber: FrameSubscriber) {
  const id = ++nextId;
  subscribers.set(id, subscriber);
  if (!visibilityAttached) {
    document.addEventListener("visibilitychange", onVisibilityChange);
    visibilityAttached = true;
  }
  resume();
  return () => {
    subscribers.delete(id);
    if (!subscribers.size) {
      cancelAnimationFrame(frame);
      frame = 0;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      visibilityAttached = false;
    }
  };
}
