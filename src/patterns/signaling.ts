/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2016, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/


/**
 * A type alias for a slot function.
 *
 * @param args - The args object emitted with the signal.
 *
 * @param sender - The object emitting the signal.
 *
 * #### Notes
 * A slot is invoked when a signal to which it is connected is emitted.
 *
 * The order of slot arguments is reversed from the type declaration.
 * Since the `args` is typically the most important parameter for the
 * slot, the reversal allows the slot to declare a `sender` only when
 * it is actually required.
 */
export
type Slot<T, U> = (args: U, sender: T) => void;


/**
 * An object used for type-safe inter-object communication.
 *
 * #### Notes
 * Signals provide a type-safe implementation of the publish-subscribe
 * pattern. An object (publisher) declares which signals it will emit,
 * and consumers connect callbacks (subscribers) to those signals. The
 * subscribers are invoked whenever the publisher emits the signal.
 *
 * #### Example
 * ```typescript
 * import { Signal } from 'phosphor-core/lib/patterns/signaling';
 *
 * class SomeClass {
 *
 *   constructor(name: string) {
 *     this._name = name;
 *   }
 *
 *   get name(): string {
 *     return this._name;
 *   }
 *
 *   get value(): number {
 *     return this._value;
 *   }
 *
 *   set value(value: number) {
 *     if (value === this._value) {
 *       return;
 *     }
 *     this._value = value;
 *     SomeClass.valueChanged.emit(this, value);
 *   }
 *
 *   private _name: string;
 *   private _value = 0;
 * }
 *
 * namespace SomeClass {
 *   export const valueChanged = new Signal<SomeClass, number>();
 * }
 *
 * function logger(value: number, sender: SomeClass): void {
 *   console.log(sender.name, value);
 * }
 *
 * let m1 = new SomeClass('foo');
 * let m2 = new SomeClass('bar');
 *
 * SomeClass.valueChanged.connect(m1, logger);
 * SomeClass.valueChanged.connect(m2, logger);
 *
 * m1.value = 42;  // logs: foo 42
 * m2.value = 17;  // logs: bar 17
 * ```
 */
export
class Signal<T, U> {
  /**
   * Connect a slot to the signal.
   *
   * @param sender - The object emitting the signal.
   *
   * @param slot - The slot to invoke when the signal is emitted.
   *
   * @param thisArg - The `this` context for the slot. If provided,
   *   this must be a non-primitive object.
   *
   * @returns `true` if the connection succeeds, `false` otherwise.
   *
   * #### Notes
   * Signal connections are unique. If a connection already exists for
   * the given `slot` and `thisArg`, this method returns `false`.
   *
   * A newly connected slot will not be invoked until the next time the
   * signal is emitted, even if the slot is connected while the signal
   * is dispatching.
   *
   * #### Example
   * ```typescript
   * // connect a method
   * SomeClass.valueChanged.connect(someObject, myObject.onValueChanged, myObject);
   *
   * // connect a plain function
   * SomeClass.valueChanged.connect(someObject, myCallback);
   * ```
   */
  connect(sender: T, slot: Slot<T, U>, thisArg?: any): boolean {
    return connect(sender, this, slot, thisArg);
  }

  /**
   * Disconnect a slot from the signal.
   *
   * @param sender - The object emitting the signal.
   *
   * @param slot - The slot to disconnect from the signal.
   *
   * @param thisArg - The `this` context for the slot. If provided,
   *   this must be a non-primitive object.
   *
   * @returns `true` if the connection is removed, `false` otherwise.
   *
   * #### Notes
   * If no connection exists for the given `slot` and `thisArg`, this
   * method returns `false`.
   *
   * A disconnected slot will no longer be invoked, even if the slot
   * is disconnected while the signal is dispatching.
   *
   * #### Example
   * ```typescript
   * // disconnect a method
   * SomeClass.valueChanged.disconnect(someObject, myObject.onValueChanged, myObject);
   *
   * // disconnect a plain function
   * SomeClass.valueChanged.disconnect(someObject, myCallback);
   * ```
   */
  disconnect(sender: T, slot: Slot<T, U>, thisArg?: any): boolean {
    return disconnect(sender, this, slot, thisArg);
  }

  /**
   * Emit the signal and invoke the connected slots.
   *
   * @param sender - The object emitting the signal.
   *
   * @param args - The args to pass to the connected slots.
   *
   * #### Notes
   * Connected slots are invoked synchronously, in the order in which
   * they are connected.
   *
   * Exceptions thrown by connected slots will be caught and logged.
   *
   * #### Example
   * ```typescript
   * SomeClass.valueChanged.emit(someObject, 42);
   * ```
   */
  emit(sender: T, args: U): void {
    emit(sender, this, args);
  }
}


/**
 * Remove all connections where the given object is the sender.
 *
 * @param sender - The sender object of interest.
 *
 * #### Example
 * ```typescript
 * disconnectSender(someObject);
 * ```
 */
export
function disconnectSender(sender: any): void {
  // If there are no receivers, there is nothing to do.
  let receiverList = senderData.get(sender);
  if (receiverList === void 0) {
    return;
  }

  // Clear the connections and schedule a cleanup of the
  // receiver's corresponding list of sender connections.
  for (let i = 0, n = receiverList.length; i < n; ++i) {
    let conn = receiverList[i];
    let senderList = receiverData.get(conn.thisArg || conn.slot);
    scheduleCleanup(senderList);
    conn.signal = null;
  }

  // Schedule a cleanup of the receiver list.
  scheduleCleanup(receiverList);
}


/**
 * Remove all connections where the given object is the receiver.
 *
 * @param receiver - The receiver object of interest.
 *
 * #### Notes
 * If a `thisArg` is provided when connecting a signal, that object
 * is considered the receiver. Otherwise, the `callback` is used as
 * the receiver.
 *
 * #### Example
 * ```typescript
 * // disconnect a regular object receiver
 * disconnectReceiver(myObject);
 *
 * // disconnect a plain callback receiver
 * disconnectReceiver(myCallback);
 * ```
 */
export
function disconnectReceiver(receiver: any): void {
  // If there are no senders, there is nothing to do.
  let senderList = receiverData.get(receiver);
  if (senderList === void 0) {
    return;
  }

  // Clear the connections and schedule a cleanup of the
  // senders's corresponding list of receiver connections.
  for (let i = 0, n = senderList.length; i < n; ++i) {
    let conn = senderList[i];
    let receiverList = senderData.get(conn.sender);
    scheduleCleanup(receiverList);
    conn.signal = null;
  }

  // Schedule a cleanup of the sender list.
  scheduleCleanup(senderList);
}


/**
 * Clear all signal data associated with the given object.
 *
 * @param obj - The object for which the signal data should be cleared.
 *
 * #### Notes
 * This removes all signal connections where the object is used as
 * either the sender or the receiver.
 *
 * #### Example
 * ```typescript
 * clearSignalData(someObject);
 * ```
 */
export
function clearSignalData(obj: any): void {
  disconnectSender(obj);
  disconnectReceiver(obj);
}


/**
 * An object which holds connection data.
 */
interface IConnection {
  /**
   * The sender emitting the signal.
   */
  sender: any;

  /**
   * The signal for the connection.
   */
  signal: Signal<any, any>;

  /**
   * The slot connected to the signal.
   */
  slot: Slot<any, any>;

  /**
   * The `this` context for the slot.
   */
  thisArg: any;
}


/**
 * A weak mapping of sender to list of receiver connections.
 */
const senderData = new WeakMap<any, IConnection[]>();


/**
 * A weak mapping of receiver to list of sender connections.
 */
const receiverData = new WeakMap<any, IConnection[]>();


/**
 * A set of connection lists which are pending cleanup.
 */
const dirtySet = new Set<IConnection[]>();


/**
 * A local reference to an event loop callback.
 */
const defer = (() => {
  let ok = typeof requestAnimationFrame === 'function';
  return ok ? requestAnimationFrame : setImmediate;
})();


/**
 * Connect a slot to a signal.
 *
 * @param sender - The object emitting the signal.
 *
 * @param signal - The signal of interest.
 *
 * @param slot - The slot to connect to the signal.
 *
 * @param thisArg - The `this` context for the slot.
 *
 * @returns `true` if the connection succeeds, `false` otherwise.
 *
 * #### Notes
 * Signal connections are unique. If a connection already exists for
 * the given `slot` and `thisArg`, this function returns `false`.
 *
 * A newly connected slot will not be invoked until the next time the
 * signal is emitted, even if the slot is connected while the signal
 * is dispatching.
 */
function connect(sender: any, signal: Signal<any, any>, slot: Slot<any, any>, thisArg?: any): boolean {
  // Coerce a `null` thisArg to `undefined`.
  thisArg = thisArg || void 0;

  // Ensure the sender's receiver list is created.
  let receiverList = senderData.get(sender);
  if (receiverList === void 0) {
    receiverList = [];
    senderData.set(sender, receiverList);
  }

  // Bail if a matching connection already exists.
  if (findConnection(receiverList, signal, slot, thisArg) !== null) {
    return false;
  }

  // Ensure the receiver's sender list is created.
  let receiver = thisArg || slot;
  let senderList = receiverData.get(receiver);
  if (senderList === void 0) {
    senderList = [];
    receiverData.set(receiver, senderList);
  }

  // Create a new connection and add it to the end of each list.
  let connection = { sender, signal, slot, thisArg };
  receiverList.push(connection);
  senderList.push(connection);

  // Indicate a successful connection.
  return true;
}


/**
 * Disconnect a slot from a signal.
 *
 * @param sender - The object emitting the signal.
 *
 * @param signal - The signal of interest.
 *
 * @param slot - The slot to disconnect from the signal.
 *
 * @param thisArg - The `this` context for the slot.
 *
 * @returns `true` if the connection is removed, `false` otherwise.
 *
 * #### Notes
 * If no connection exists for the given `slot` and `thisArg`, this
 * function returns `false`.
 *
 * A disconnected slot will no longer be invoked, even if the slot
 * is disconnected while the signal is dispatching.
 */
function disconnect(sender: any, signal: Signal<any, any>, slot: Slot<any, any>, thisArg?: any): boolean {
  // Coerce a `null` thisArg to `undefined`.
  thisArg = thisArg || void 0;

  // Lookup the list of receivers, and bail if none exist.
  let receiverList = senderData.get(sender);
  if (receiverList === void 0) {
    return false;
  }

  // Bail if no matching connection exits.
  let conn = findConnection(receiverList, signal, slot, thisArg);
  if (conn === null) {
    return false;
  }

  // Lookup the list of senders, which is now known to exist.
  let senderList = receiverData.get(thisArg || slot);

  // Clear the connection and schedule list cleanup.
  conn.signal = null;
  scheduleCleanup(receiverList);
  scheduleCleanup(senderList);

  // Indicate a successful disconnection.
  return true;
}


/**
 * Emit a signal and invoke the connected slots.
 *
 * @param sender - The object emitting the signal.
 *
 * @param signal - The signal of interest.
 *
 * @param args - The args to pass to the connected slots.
 *
 * #### Notes
 * Connected slots are invoked synchronously, in the order in which
 * they are connected.
 *
 * Exceptions thrown by connected slots will be caught and logged.
 */
function emit(sender: any, signal: Signal<any, any>, args: any): void {
  // If there are no receivers, there is nothing to do.
  let receiverList = senderData.get(sender);
  if (receiverList === void 0) {
    return;
  }

  // Invoke the connections which match the given signal.
  for (let i = 0, n = receiverList.length; i < n; ++i) {
    let conn = receiverList[i];
    if (conn.signal === signal) {
      invokeSlot(conn, args);
    }
  }
}


/**
 * Safely invoke a non-empty connection.
 *
 * @param conn - The connection of interest
 *
 * @param args - The arguments to pass to the slot.
 *
 * #### Notes
 * Any exception thrown by the slot will be caught and logged.
 */
function invokeSlot(conn: IConnection, args: any): void {
  try {
    conn.slot.call(conn.thisArg, args, conn.sender);
  } catch (err) {
    console.error(err);
  }
}


/**
 * Find a connection which matches the given parameters.
 *
 * @param list - The list of connections to search.
 *
 * @param signal - The signal of interest.
 *
 * @param slot - The slot of interest.
 *
 * @param thisArg - The `this` context for the slot.
 *
 * @returns The first connection which matches the supplied parameters,
 *   or null if no matching connection is found.
 */
function findConnection(list: IConnection[], signal: Signal<any, any>, slot: Slot<any, any>, thisArg: any): IConnection {
  for (let i = 0, n = list.length; i < n; ++i) {
    let conn = list[i];
    if (conn.signal === signal &&
        conn.slot === slot &&
        conn.thisArg === thisArg) {
      return conn;
    }
  }
  return null;
}


/**
 * Schedule a cleanup of a connection list.
 *
 * @param list - The list of connections to cleanup.
 *
 * #### Notes
 * This will add the list to the dirty set and schedule a deferred
 * cleanup of the list contents. On cleanup, any connection with a
 * null signal will be removed from the array.
 */
function scheduleCleanup(list: IConnection[]): void {
  if (dirtySet.size === 0) {
    defer(cleanupDirtySet);
  }
  dirtySet.add(list);
}


/**
 * Cleanup the connection lists in the dirty set.
 *
 * #### Notes
 * This function should only be invoked asynchronously, when the stack
 * frame is guaranteed to not be on the path of a signal dispatch.
 */
function cleanupDirtySet(): void {
  dirtySet.forEach(cleanupList);
  dirtySet.clear();
}


/**
 * Cleanup the dirty connections in a connection list.
 *
 * @param list - The list of connection to cleanup.
 *
 * #### Notes
 * This will remove any connection with a null signal from the list,
 * while retaining the relative order of the other connections.
 *
 * This function should only be invoked asynchronously, when the stack
 * frame is guaranteed to not be on the path of a signal dispatch.
 */
function cleanupList(list: IConnection[]): void {
  let count = 0;
  for (let i = 0, n = list.length; i < n; ++i) {
    let conn = list[i];
    if (conn.signal === null) {
      count++;
    } else {
      list[i - count] = conn;
    }
  }
  list.length -= count;
}
